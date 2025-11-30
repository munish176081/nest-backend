import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingsRepository } from './listings.repository';
import { CreateListingDto, UpdateListingDto } from './dto';
import { QueryListingDto, SearchListingDto } from './dto/query-listing.dto';
import { Listing, ListingStatusEnum, ListingTypeEnum, ListingAvailabilityEnum } from './entities/listing.entity';
import { ListingResponseDto, ListingSummaryDto, PaginatedListingsResponseDto } from './dto/response-listing.dto';
import { BreedsService } from '../breeds/breeds.service';
import { calculateAge } from '../../helpers/date';
import { UsersService } from '../accounts/users.service';
import { ActivityLogsService } from '../accounts/activity-logs.service';
import { Payment } from '../payments/entities/payment.entity';
import { Subscription, SubscriptionStatusEnum } from '../subscriptions/entities/subscription.entity';

@Injectable()
export class ListingsService {
  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly breedsService: BreedsService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ActivityLogsService))
    private readonly activityLogsService: ActivityLogsService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) { }

  async createListing(createListingDto: CreateListingDto, userId: string, ipAddress?: string, userAgent?: string): Promise<ListingResponseDto> {
    // Validate listing type and category
    this.validateListingTypeAndCategory(createListingDto.type, createListingDto.category);

    // Process and validate dynamic fields based on listing type
    const processedFields = createListingDto.fields ? await this.processListingFields(createListingDto.type, createListingDto.fields) : {};

    // Debug logging for fields data
    console.log('🔍 Creating listing with fields:', {
      originalFields: createListingDto.fields,
      processedFields: processedFields,
      badges: processedFields.badges,
      dnaResults: processedFields.dnaResults,
      hasBadges: Array.isArray(processedFields.badges),
      hasDnaResults: Array.isArray(processedFields.dnaResults)
    });

    // Build metadata object - preserve all metadata from DTO and merge with backend fields
    const metadata: Record<string, any> = {
      contactInfo: createListingDto.contactInfo,
      images: createListingDto.images || [],
      videos: createListingDto.videos || [],
      documents: createListingDto.documents || [],
      tags: createListingDto.tags || [],
      featured: createListingDto.isFeatured || false,
      premium: createListingDto.isPremium || false,
      ...createListingDto.metadata, // Preserve all frontend metadata (including parent images/videos) - spread last to avoid overwrites
    };

    // Calculate expiration date based on listing type
    const expiresAt = this.calculateExpirationDate(createListingDto.type, createListingDto.expiresAt);

    // Get breed name if breedId is provided
    let breedName = createListingDto.breed;
    if (createListingDto.breedId) {
      const breed = await this.breedsService.findById(createListingDto.breedId);
      if (breed) {
        breedName = breed.name;
      }
    }

    const listingData: Partial<Listing> = {
      userId,
      type: createListingDto.type,
      category: createListingDto.category,
      title: createListingDto.title,
      description: createListingDto.description,
      fields: processedFields,
      metadata,
      price: createListingDto.price,
      breed: breedName, // Use the breed name
      breedId: createListingDto.breedId, // Store the breed ID for relation
      location: createListingDto.location,
      expiresAt,
      startedOrRenewedAt: new Date(),
      status: createListingDto.status || ListingStatusEnum.ACTIVE,
      isActive: createListingDto.status === ListingStatusEnum.DRAFT ? false : true,
      seoData: createListingDto.seoData,
      motherInfo: createListingDto.motherInfo,
      fatherInfo: createListingDto.fatherInfo,
      studInfo: createListingDto.studInfo,
      paymentId: createListingDto.paymentId || null,
      subscriptionId: createListingDto.subscriptionId || null,
    };

    const listing = await this.listingsRepository.create(listingData);
    
    // If listing was created with a paymentId, update the payment record's listingId
    if (listing.paymentId) {
      try {
        console.log('🔗 Linking payment to listing:', { paymentId: listing.paymentId, listingId: listing.id });
        await this.paymentRepository
          .createQueryBuilder()
          .update(Payment)
          .set({ listingId: listing.id })
          .where('id = :paymentId', { paymentId: listing.paymentId })
          .execute();
        console.log('✅ Payment linked to listing successfully');
      } catch (error) {
        console.error('❌ Error linking payment to listing:', error);
        // Don't throw error - listing is already created, just log the issue
      }
    }

    // If listing was created with a subscriptionId, update the subscription record's listingId
    if (listing.subscriptionId) {
      try {
        console.log('🔗 Linking subscription to listing:', { subscriptionId: listing.subscriptionId, listingId: listing.id });
        
        // Try to find subscription by database ID first (in case frontend passes database ID)
        let subscription = await this.subscriptionRepository.findOne({
          where: { id: listing.subscriptionId },
        });
        
        // If not found by database ID, try by provider subscription ID (Stripe or PayPal)
        if (!subscription) {
          console.log('🔍 Subscription not found by database ID, trying provider subscription ID...');
          subscription = await this.subscriptionRepository.findOne({
            where: { subscriptionId: listing.subscriptionId },
          });
        }
        
        if (subscription) {
          console.log('✅ Found subscription:', {
            databaseId: subscription.id,
            stripeSubscriptionId: subscription.subscriptionId,
            currentListingId: subscription.listingId,
            status: subscription.status,
          });
          
          subscription.listingId = listing.id;
          // Update expiration based on subscription period
          if (subscription.currentPeriodEnd) {
            listing.expiresAt = subscription.currentPeriodEnd;
            await this.listingsRepository.update(listing.id, { expiresAt: subscription.currentPeriodEnd });
            console.log('📅 Updated listing expiration to:', subscription.currentPeriodEnd);
          }
          await this.subscriptionRepository.save(subscription);
          console.log('✅ Subscription linked to listing successfully');
          
          // Update the listing's subscriptionId field to store the database subscription ID (UUID)
          // Ensure it's set to the database subscription ID, not the Stripe subscription ID
          if (listing.subscriptionId !== subscription.id) {
            await this.listingsRepository.update(listing.id, { 
              subscriptionId: subscription.id 
            });
            console.log('✅ Updated listing.subscriptionId to database subscription ID:', subscription.id);
          }

          // Update any payment records associated with this subscription that don't have a listingId yet
          try {
            const updatedPayments = await this.paymentRepository
              .createQueryBuilder()
              .update(Payment)
              .set({ listingId: listing.id })
              .where('listingId IS NULL')
              .andWhere(
                `(metadata->>'subscriptionId' = :subscriptionId OR metadata->>'paypalSubscriptionId' = :providerSubscriptionId)`,
                { subscriptionId: subscription.id, providerSubscriptionId: subscription.subscriptionId }
              )
              .execute();
            
            if (updatedPayments.affected && updatedPayments.affected > 0) {
              console.log(`✅ Updated ${updatedPayments.affected} payment record(s) with listing ID:`, listing.id);
            }
          } catch (paymentUpdateError) {
            console.error('❌ Error updating payment records with listing ID:', paymentUpdateError);
            // Don't throw error - listing is already created and subscription is linked
          }
        } else {
          console.warn('⚠️ Subscription not found with subscriptionId (tried both database ID and provider subscription ID):', listing.subscriptionId);
        }
      } catch (error) {
        console.error('❌ Error linking subscription to listing:', error);
        // Don't throw error - listing is already created, just log the issue
      }
    }
    
    // Log listing creation activity
    try {
      const user = await this.usersService.getUserById(userId);
      if (user) {
        await this.activityLogsService.logListingCreation(listing, user, ipAddress, userAgent);
      }
    } catch (error) {
      console.error('Failed to log listing creation activity:', error);
      // Don't throw error as this is not critical for listing creation flow
    }
    
    return this.transformToListingResponse(listing);
  }

  async updateListing(userId: string, listingId: string, updateListingDto: UpdateListingDto): Promise<ListingResponseDto> {
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    // Process dynamic fields if they're being updated
    let processedFields = listing.fields;
    if (updateListingDto.fields) {
      processedFields = await this.processListingFields(listing.type, updateListingDto.fields);
      
      // Debug logging for updated fields
      console.log('🔍 Updating listing with fields:', {
        originalFields: listing.fields,
        newFields: updateListingDto.fields,
        processedFields: processedFields,
        badges: processedFields.badges,
        dnaResults: processedFields.dnaResults,
        hasBadges: Array.isArray(processedFields.badges),
        hasDnaResults: Array.isArray(processedFields.dnaResults)
      });
    }

    // Handle metadata updates - preserve all metadata from DTO and merge with existing metadata
    let metadata = {
      ...listing.metadata, // Preserve existing metadata
      ...updateListingDto.metadata, // Preserve all frontend metadata (including parent images/videos) - spread last to avoid overwrites
    };

    // Get breed name if breedId is being updated
    let breedName = updateListingDto.breed;
    if (updateListingDto.breedId && updateListingDto.breedId !== listing.breedId) {
      const breed = await this.breedsService.findById(updateListingDto.breedId);
      if (breed) {
        breedName = breed.name;
      }
    }

    // Update specific fields if provided
    if (updateListingDto.title !== undefined) listing.title = updateListingDto.title;
    if (updateListingDto.description !== undefined) listing.description = updateListingDto.description;
    if (updateListingDto.price !== undefined) listing.price = updateListingDto.price;
    if (updateListingDto.breed !== undefined) listing.breed = updateListingDto.breed;
    if (updateListingDto.breedId !== undefined) listing.breedId = updateListingDto.breedId;
    if (updateListingDto.location !== undefined) listing.location = updateListingDto.location;

    const updateData: Partial<Listing> = {
      title: updateListingDto.title,
      description: updateListingDto.description,
      price: updateListingDto.price,
      breed: breedName || updateListingDto.breed,
      breedId: updateListingDto.breedId,
      location: updateListingDto.location,
      fields: processedFields,
      metadata,
      expiresAt: updateListingDto.expiresAt ? new Date(updateListingDto.expiresAt) : undefined,
      seoData: updateListingDto.seoData,
      motherInfo: updateListingDto.motherInfo,
      fatherInfo: updateListingDto.fatherInfo,
      studInfo: updateListingDto.studInfo,
      subscriptionId: updateListingDto.subscriptionId,
    };

    const updatedListing = await this.listingsRepository.update(listingId, updateData);
    
    // If subscriptionId was provided, link the subscription to the listing
    if (updateListingDto.subscriptionId) {
      try {
        console.log('🔗 Linking subscription to listing (update):', { subscriptionId: updateListingDto.subscriptionId, listingId });
        
        // Try to find subscription by database ID first (in case frontend passes database ID)
        let subscription = await this.subscriptionRepository.findOne({
          where: { id: updateListingDto.subscriptionId },
        });
        
        // If not found by database ID, try by Stripe subscription ID
        if (!subscription) {
          console.log('🔍 Subscription not found by database ID, trying Stripe subscription ID...');
          subscription = await this.subscriptionRepository.findOne({
            where: { subscriptionId: updateListingDto.subscriptionId },
          });
        }
        
        if (subscription) {
          console.log('✅ Found subscription:', {
            databaseId: subscription.id,
            stripeSubscriptionId: subscription.subscriptionId,
            currentListingId: subscription.listingId,
            status: subscription.status,
          });
          
          subscription.listingId = listingId;
          // Update expiration based on subscription period
          if (subscription.currentPeriodEnd) {
            await this.listingsRepository.update(listingId, { expiresAt: subscription.currentPeriodEnd });
            console.log('📅 Updated listing expiration to:', subscription.currentPeriodEnd);
          }
          await this.subscriptionRepository.save(subscription);
          console.log('✅ Subscription linked to listing successfully (update)');
          
          // Update the listing's subscriptionId field to store the database subscription ID (UUID)
          // The frontend already passed the database subscription ID, but ensure it's set correctly
          if (subscription.id !== updateListingDto.subscriptionId) {
            await this.listingsRepository.update(listingId, { 
              subscriptionId: subscription.id 
            });
            console.log('✅ Updated listing.subscriptionId to database subscription ID:', subscription.id);
          }
        } else {
          console.warn('⚠️ Subscription not found with subscriptionId (tried both database ID and Stripe ID):', updateListingDto.subscriptionId);
        }
      } catch (error) {
        console.error('❌ Error linking subscription to listing (update):', error);
        // Don't throw error - listing is already updated, just log the issue
      }
    }
    
    return this.transformToListingResponse(updatedListing);
  }

  async updateAvailability(userId: string, listingId: string, availability: ListingAvailabilityEnum): Promise<ListingResponseDto> {
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    const updateData: Partial<Listing> = {
      availability,
    };

    const updatedListing = await this.listingsRepository.update(listingId, updateData);
    return this.transformToListingResponse(updatedListing);
  }

  async publishListing(userId: string, listingId: string): Promise<ListingResponseDto> {
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only publish your own listings');
    }

    if (listing.status !== ListingStatusEnum.DRAFT) {
      throw new BadRequestException('Only draft listings can be published');
    }

    // Validate required fields for the listing type
    await this.validateRequiredFields(listing.type, listing.fields);

    const updateData: Partial<Listing> = {
      status: ListingStatusEnum.ACTIVE,
      publishedAt: new Date(),
    };

    const updatedListing = await this.listingsRepository.update(listingId, updateData);
    return this.transformToListingResponse(updatedListing);
  }

  async deleteListing(userId: string, listingId: string): Promise<void> {
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.listingsRepository.softDelete(listingId);
  }

  async getListingById(listingId: string, incrementView = false, userId?: string): Promise<ListingResponseDto> {
    const listing = await this.listingsRepository.findById(listingId, true);
    
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // If userId is provided, check ownership
    if (userId && listing.userId !== userId) {
      throw new ForbiddenException('You can only view your own listings');
    }

    if (incrementView && listing.status === ListingStatusEnum.ACTIVE) {
      await this.listingsRepository.incrementViewCount(listingId);
    }

    console.log(userId, listing.userId, "userId DEBUG");

    return this.transformToListingResponse(listing);
  }

  async getUserListings(userId: string, options?: {
    status?: ListingStatusEnum;
    includeExpired?: boolean;
    includeDrafts?: boolean;
  }): Promise<ListingSummaryDto[]> {
    const listings = await this.listingsRepository.findByUserId(userId, options);
    return listings.map(listing => this.transformToListingSummary(listing));
  }

  async searchListings(searchDto: SearchListingDto): Promise<PaginatedListingsResponseDto> {
    const result = await this.listingsRepository.searchListings(searchDto);

    return {
      data: result.listings.map(listing => this.transformToListingSummary(listing)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.page < result.totalPages,
      hasPrev: result.page > 1,
    };
  }

  async getListings(queryDto: QueryListingDto): Promise<PaginatedListingsResponseDto> {
    console.log('📋 getListings called with queryDto:', queryDto);
    const result = await this.listingsRepository.findActiveListings(queryDto);
    console.log('📋 Found listings count:', result.listings.length);
    
    // Log each listing before transformation
    result.listings.forEach((listing, index) => {
      console.log(`📋 Listing ${index} (${listing.id}):`, {
        type: listing.type,
        hasFields: !!listing.fields,
        hasIndividualPuppies: !!listing.fields?.individualPuppies,
        individualPuppiesCount: listing.fields?.individualPuppies?.length,
        hasMetadata: !!listing.metadata,
        hasMetadataImages: !!listing.metadata?.images,
        metadataImagesCount: listing.metadata?.images?.length
      });
    });

    return {
      data: result.listings.map(listing => this.transformToListingSummary(listing)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.page < result.totalPages,
      hasPrev: result.page > 1,
    };
  }

  async getFeaturedListings(limit = 10): Promise<ListingSummaryDto[]> {
    const listings = await this.listingsRepository.findFeaturedListings(limit);
    return listings.map(listing => this.transformToListingSummary(listing));
  }

  async getPremiumListings(limit = 10): Promise<ListingSummaryDto[]> {
    const listings = await this.listingsRepository.findPremiumListings(limit);
    return listings.map(listing => this.transformToListingSummary(listing));
  }

  async incrementFavoriteCount(listingId: string): Promise<void> {
    const listing = await this.listingsRepository.findById(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    await this.listingsRepository.incrementFavoriteCount(listingId);
  }

  async decrementFavoriteCount(listingId: string): Promise<void> {
    const listing = await this.listingsRepository.findById(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    await this.listingsRepository.decrementFavoriteCount(listingId);
  }

  async incrementContactCount(listingId: string): Promise<void> {
    const listing = await this.listingsRepository.findById(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    await this.listingsRepository.incrementContactCount(listingId);
  }

  async getListingStats(userId?: string): Promise<{
    total: number;
    active: number;
    draft: number;
    expired: number;
    featured: number;
    premium: number;
  }> {
    return await this.listingsRepository.getListingStats(userId);
  }

  private validateListingTypeAndCategory(type: ListingTypeEnum, category: string): void {
    const typeCategoryMap: Record<ListingTypeEnum, string> = {
      'SEMEN_LISTING': 'breeding',
      'PUPPY_LISTING': 'puppy',
      'PUPPY_LITTER_LISTING': 'puppy',
      'LITTER_LISTING': 'puppy',
      'STUD_LISTING': 'breeding',
      'FUTURE_LISTING': 'puppy',
      'WANTED_LISTING': 'wanted',
      'OTHER_SERVICES': 'service',
    };

    if (typeCategoryMap[type] !== category) {
      throw new BadRequestException(`Invalid category for listing type: ${type}`);
    }
  }

  private async processListingFields(type: ListingTypeEnum, fields: Record<string, any>): Promise<Record<string, any>> {
    // Process fields to add calculated values
    const processedFields = { ...fields };
    
    // For STUD_LISTING, age is provided directly as a number, not calculated from dateOfBirth
    // For other listing types, calculate age from dateOfBirth if present
    if (type !== ListingTypeEnum.STUD_LISTING && processedFields.dateOfBirth) {
      processedFields.age = calculateAge(processedFields.dateOfBirth);
    }
    // For STUD_LISTING, ensure age is stored as a string for display consistency
    else if (type === ListingTypeEnum.STUD_LISTING && processedFields.age !== undefined) {
      // Age is already provided as a number, format it for display
      const ageValue = typeof processedFields.age === 'number' 
        ? processedFields.age 
        : parseInt(processedFields.age);
      processedFields.age = isNaN(ageValue) ? 'Unknown Age' : `${ageValue} year${ageValue !== 1 ? 's' : ''}`;
    }
    
    return processedFields;
  }



  private calculateExpirationDate(type: ListingTypeEnum, customExpiresAt?: string): Date | null {
    if (customExpiresAt) {
      return new Date(customExpiresAt);
    }

    // Default expiration based on listing type
    const expirationDays: Record<ListingTypeEnum, number> = {
      'SEMEN_LISTING': 30,
      'PUPPY_LISTING': 90,
      'PUPPY_LITTER_LISTING': 90,
      'LITTER_LISTING': 90,
      'STUD_LISTING': 30,
      'FUTURE_LISTING': 180,
      'WANTED_LISTING': 90,
      'OTHER_SERVICES': 30,
    };

    const days = expirationDays[type];
    if (days) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      return expiresAt;
    }

    return null;
  }

  private async validateRequiredFields(type: ListingTypeEnum, fields: Record<string, any>): Promise<void> {
    // Add validation logic for required fields based on listing type
    // This would validate against the frontend configuration
    // For now, just a basic check
    if (!fields || Object.keys(fields).length === 0) {
      throw new BadRequestException('Listing fields are required');
    }
  }

  private async transformToListingResponse(listing: Listing): Promise<ListingResponseDto> {
    // Calculate age from dateOfBirth if present in fields (for non-stud listings)
    // For STUD_LISTING, age is provided directly as a number
    let calculatedAge = '';
    if (listing.type === ListingTypeEnum.STUD_LISTING) {
      // For stud listings, use age field directly
      if (listing.fields?.age !== undefined) {
        const ageValue = typeof listing.fields.age === 'number' 
          ? listing.fields.age 
          : parseInt(listing.fields.age);
        calculatedAge = isNaN(ageValue) ? 'Unknown Age' : `${ageValue} year${ageValue !== 1 ? 's' : ''}`;
      }
    } else if (listing.fields?.dateOfBirth) {
      calculatedAge = calculateAge(listing.fields.dateOfBirth);
    }

    // Calculate featuredImage based on listing type
    let featuredImage = null;
    
    if (listing.type === 'PUPPY_LITTER_LISTING' && listing.fields?.individualPuppies?.length > 0) {
      const allPuppyImages: string[] = [];
      listing.fields.individualPuppies.forEach((puppy: any) => {
        if (puppy.puppyImages && Array.isArray(puppy.puppyImages)) {
          allPuppyImages.push(...puppy.puppyImages);
        }
      });
      featuredImage = allPuppyImages[0] || listing.metadata?.images?.[0] || null;
    } else {
      featuredImage = listing.metadata?.images?.[0] || null;
    }

    const user = await this.usersService.getUserById(listing.userId);
    
    // Transform user object to only include necessary fields
    const transformedUser = user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      imageUrl: user.imageUrl,
    } : null;
    
    const transformedFields = {
      ...listing.fields,
      age: calculatedAge || listing.fields?.age || '',
    };

    // Determine the type based on listLitterOption for PUPPY_LITTER_LISTING
    let displayType = listing.type;
    // if (listing.type === ListingTypeEnum.PUPPY_LITTER_LISTING && listing.fields?.listLitterOption === 'single-puppy') {
    //   displayType = ListingTypeEnum.PUPPY_LISTING;
    // }
    // else if (listing.type === ListingTypeEnum.PUPPY_LITTER_LISTING && listing.fields?.listLitterOption === 'add-individually') {
    //   displayType = ListingTypeEnum.LITTER_LISTING;
    // }
    // else {
    //   displayType = ListingTypeEnum.LITTER_LISTING;
    // }

    return {
      id: listing.id,
      userId: listing.userId,
      type: displayType,
      status: listing.status,
      category: listing.category,
      title: listing.title,
      description: listing.description,
      fields: transformedFields,
      age: calculatedAge || listing.fields?.age || '',
      metadata: listing.metadata,
      price: listing.price,
      breed: listing.breed,
      breedId: listing.breedId,
      breedName: listing.breedRelation?.name || listing.breed,
      location: listing.location,
      featuredImage: featuredImage,
      expiresAt: listing.expiresAt,
      startedOrRenewedAt: listing.startedOrRenewedAt,
      publishedAt: listing.publishedAt,
      viewCount: listing.viewCount,
      favoriteCount: listing.favoriteCount,
      contactCount: listing.contactCount,
      isFeatured: listing.isFeatured,
      isPremium: listing.isPremium,
      isActive: listing.isActive,
      seoData: listing.seoData,
      analytics: listing.analytics,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      availability: listing.availability,
      motherInfo: listing.motherInfo,
      fatherInfo: listing.fatherInfo,
      studInfo: listing.studInfo,
      user: transformedUser,
    };
  }

  private transformToListingSummary(listing: Listing): ListingSummaryDto {
    // Calculate age from dateOfBirth if present in fields (for non-stud listings)
    // For STUD_LISTING, age is provided directly as a number
    let calculatedAge = '';
    if (listing.type === ListingTypeEnum.STUD_LISTING) {
      // For stud listings, use age field directly
      if (listing.fields?.age !== undefined) {
        const ageValue = typeof listing.fields.age === 'number' 
          ? listing.fields.age 
          : parseInt(listing.fields.age);
        calculatedAge = isNaN(ageValue) ? 'Unknown Age' : `${ageValue} year${ageValue !== 1 ? 's' : ''}`;
      }
    } else if (listing.fields?.dateOfBirth) {
      calculatedAge = calculateAge(listing.fields.dateOfBirth);
    }
    
    // Calculate featuredImage based on listing type
    let featuredImage = null;
    
    if (listing.type === 'PUPPY_LITTER_LISTING' && listing.fields?.individualPuppies?.length > 0) {
      console.log('🖼️ Processing puppy litter listing for featuredImage');
      const allPuppyImages: string[] = [];
      listing.fields.individualPuppies.forEach((puppy: any) => {
        if (puppy.puppyImages && Array.isArray(puppy.puppyImages)) {
          allPuppyImages.push(...puppy.puppyImages);
        }
      });
      featuredImage = allPuppyImages[0] || listing.metadata?.images?.[0] || null;
      console.log('🖼️ Featured image set to:', featuredImage);
    } else {
      featuredImage = listing.metadata?.images?.[0] || null;
    }
    
    // Transform user object to only include necessary fields
    const transformedUser = listing.user ? {
      id: listing.user.id,
      name: listing.user.name,
      email: listing.user.email,
      username: listing.user.username,
      imageUrl: listing.user.imageUrl,
    } : null;
    
    // Determine the type based on listLitterOption for PUPPY_LITTER_LISTING
    let displayType = listing.type;
    if (listing.type === ListingTypeEnum.PUPPY_LITTER_LISTING && listing.fields?.listLitterOption === 'single-puppy') {
      displayType = ListingTypeEnum.PUPPY_LISTING;
    }
    
    const result = {
      id: listing.id,
      type: displayType,
      status: listing.status,
      category: listing.category,
      title: listing.title,
      price: listing.price,
      breed: listing.breed,
      description: listing.description,
      breedId: listing.breedId,
      breedName: listing.breedRelation?.name || listing.breed,
      location: listing.location,
      featuredImage: featuredImage,
      metadata: listing.metadata || {},
      viewCount: listing.viewCount,
      favoriteCount: listing.favoriteCount,
      isFeatured: listing.isFeatured,
      isPremium: listing.isPremium,
      createdAt: listing.createdAt,
      availability: listing.availability,
      user: transformedUser,
      fields: listing.fields,
      // Add calculated age to summary
      age: calculatedAge || listing.fields?.age || '',
      paymentId: listing.paymentId || null,
      subscriptionId: listing.subscriptionId || null,
      expiresAt: listing.expiresAt,
      isActive: listing.isActive,
    };
    
    return result;
  }

  /**
   * Sync listing subscription status from Stripe and update listing accordingly
   */
  async syncListingSubscriptionStatus(userId: string, listingId: string): Promise<ListingResponseDto> {
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only sync your own listings');
    }

    // If listing has a subscription, sync it from Stripe
    if (listing.subscriptionId) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: listing.subscriptionId },
      });

      if (subscription && subscription.paymentMethod === 'stripe') {
        // Sync subscription from Stripe
        await this.subscriptionsService.syncSubscriptionsFromStripe(userId);

        // Reload subscription to get updated status
        const updatedSubscription = await this.subscriptionRepository.findOne({
          where: { id: listing.subscriptionId },
        });

        if (updatedSubscription) {
          const inactiveStatuses = [
            SubscriptionStatusEnum.CANCELLED,
            SubscriptionStatusEnum.PAST_DUE,
            SubscriptionStatusEnum.UNPAID,
            SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
          ];

          // If subscription is canceled/inactive, deactivate listing
          if (inactiveStatuses.includes(updatedSubscription.status)) {
            const updateData: Partial<Listing> = {
              isActive: false,
              status: ListingStatusEnum.EXPIRED,
            };
            await this.listingsRepository.update(listingId, updateData);
          } else if (updatedSubscription.status === SubscriptionStatusEnum.ACTIVE) {
            // If subscription is active, ensure listing is active
            const updateData: Partial<Listing> = {
              isActive: true,
              status: ListingStatusEnum.ACTIVE,
              expiresAt: updatedSubscription.currentPeriodEnd,
            };
            await this.listingsRepository.update(listingId, updateData);
          }
        }
      }
    }

    const updatedListing = await this.listingsRepository.findById(listingId);
    return this.transformToListingResponse(updatedListing);
  }

  /**
   * Reactivate an expired/inactive listing by linking a new subscription
   */
  async reactivateListing(userId: string, listingId: string, subscriptionId?: string): Promise<ListingResponseDto> {
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only reactivate your own listings');
    }

    // Check if listing is expired or inactive
    if (listing.isActive && listing.status === ListingStatusEnum.ACTIVE) {
      // throw new BadRequestException('Listing is already active');
      // commenting for now
    }

    // If subscriptionId is provided, link it to the listing
    if (subscriptionId) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new ForbiddenException('Subscription does not belong to you');
      }

      // Link subscription to listing
      subscription.listingId = listingId;
      await this.subscriptionRepository.save(subscription);

      // Update listing with subscription info
      const updateData: Partial<Listing> = {
        subscriptionId: subscription.id,
        isActive: true,
        status: ListingStatusEnum.ACTIVE,
        startedOrRenewedAt: new Date(),
      };

      // Update expiration based on subscription period
      if (subscription.currentPeriodEnd) {
        updateData.expiresAt = subscription.currentPeriodEnd;
      }

      const updatedListing = await this.listingsRepository.update(listingId, updateData);
      return this.transformToListingResponse(updatedListing);
    }

    throw new BadRequestException('Subscription ID is required for reactivation');
  }

  /**
   * Check and update expired listings based on subscription status
   * Expired listings should be marked as expired but still visible (not hidden)
   */
  async checkAndUpdateExpiredListings(): Promise<void> {
    const now = new Date();
    
    // Find listings that have expired but are still active
    const expiredListings = await this.listingRepository
      .createQueryBuilder('listing')
      .where('listing.expiresAt < :now', { now })
      .andWhere('listing.isActive = :isActive', { isActive: true })
      .getMany();

    for (const listing of expiredListings) {
      // If listing has a subscription, check its status
      if (listing.subscriptionId) {
        const subscription = await this.subscriptionRepository.findOne({
          where: { id: listing.subscriptionId },
        });

        if (subscription) {
          // If subscription is active, update expiration to current period end
          if (subscription.status === 'active' && subscription.currentPeriodEnd) {
            listing.expiresAt = subscription.currentPeriodEnd;
            await this.listingsRepository.update(listing.id, { expiresAt: subscription.currentPeriodEnd });
            continue;
          }
        }
      }

      // Mark listing as expired but keep it visible (isActive = true)
      // The status will be updated to 'expired' but listing remains visible
      await this.listingsRepository.update(listing.id, { 
        status: ListingStatusEnum.EXPIRED,
        // Keep isActive = true so listing is still visible
      });
    }
  }
} 