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
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { images, postmarkEmailTemplates } from '../email/templates';

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
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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
      status: createListingDto.status || ListingStatusEnum.PENDING_REVIEW,
      isActive: (createListingDto.status === ListingStatusEnum.DRAFT || createListingDto.status === ListingStatusEnum.PENDING_REVIEW || !createListingDto.status) ? false : true,
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
    console.log('🔔 [Listings Service] updateListing - START');
    console.log('🔔 [Listings Service] updateListing - Input:', {
      listingId,
      userId,
      updateListingDto: JSON.stringify(updateListingDto, null, 2),
    });
    
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }
    
    console.log('📋 [Listings Service] updateListing - Listing BEFORE UPDATE:', {
      listingId: listing.id,
      currentStatus: listing.status,
      isActive: listing.isActive,
      subscriptionId: listing.subscriptionId,
    });

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

    // Handle status update if provided
    if (updateListingDto.status !== undefined) {
      updateData.status = updateListingDto.status;
      console.log('📊 [Listings Service] updateListing - Status update requested:', {
        newStatus: updateListingDto.status,
        currentStatus: listing.status,
      });
    }

    console.log('💾 [Listings Service] updateListing - Update data to be applied:', JSON.stringify(updateData, null, 2));

    const updatedListing = await this.listingsRepository.update(listingId, updateData);
    
    console.log('✅ [Listings Service] updateListing - Listing AFTER UPDATE:', {
      listingId: updatedListing.id,
      newStatus: updatedListing.status,
      newIsActive: updatedListing.isActive,
      newSubscriptionId: updatedListing.subscriptionId,
    });
    
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
          
          // Get current listing status before updating
          const currentListing = await this.listingsRepository.findById(listingId);
          const currentStatus = currentListing?.status;
          
          console.log('📊 [Listings Service] updateListing - Current listing status before subscription link:', currentStatus);
          
          // Update expiration based on subscription period
          const expirationUpdate: Partial<Listing> = {};
          if (subscription.currentPeriodEnd) {
            expirationUpdate.expiresAt = subscription.currentPeriodEnd;
            console.log('📅 Updated listing expiration to:', subscription.currentPeriodEnd);
          }
          
          // IMPORTANT: Do NOT set status to ACTIVE here, even if subscription is ACTIVE
          // The status should be set by the frontend (PENDING_REVIEW) or by webhook handlers
          // Only update expiration, not status
          if (Object.keys(expirationUpdate).length > 0) {
            await this.listingsRepository.update(listingId, expirationUpdate);
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
          
          // Log final status to verify it wasn't changed
          const finalListing = await this.listingsRepository.findById(listingId);
          console.log('📊 [Listings Service] updateListing - Final listing status after subscription link:', finalListing?.status);
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
    return listings.map(listing => this.transformToListingSummary(listing as any));
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

  async getAdminListings(queryDto: QueryListingDto): Promise<PaginatedListingsResponseDto> {
    console.log('📋 [Admin] getAdminListings called with queryDto:', queryDto);
    const result = await this.listingsRepository.findAdminListings(queryDto);
    console.log('📋 [Admin] Found listings count:', result.listings.length);

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
      subscriptionRenewalDate: (listing as any).subscriptionRenewalDate || null,
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
            // If subscription is active, update expiration but DON'T auto-activate listing
            // Listing should remain in PENDING_REVIEW until admin approves it
            // Only update expiration date, not status
            const updateData: Partial<Listing> = {
              expiresAt: updatedSubscription.currentPeriodEnd,
            };
            
            // Only update status if listing is in DRAFT or EXPIRED (needs admin approval)
            // Don't change status if it's already PENDING_REVIEW or ACTIVE
            if (listing.status === ListingStatusEnum.DRAFT) {
              updateData.status = ListingStatusEnum.PENDING_REVIEW;
              updateData.isActive = false;
              console.log('⏳ [Sync] Changing listing from DRAFT to PENDING_REVIEW for admin approval');
            } else if (listing.status === ListingStatusEnum.EXPIRED) {
              updateData.status = ListingStatusEnum.PENDING_REVIEW;
              updateData.isActive = false;
              console.log('🔄 [Sync] Reactivating expired listing to PENDING_REVIEW for admin approval');
            } else {
              // For other statuses (PENDING_REVIEW, ACTIVE, etc.), just update expiration
              console.log('⏳ [Sync] Updated listing expiration, keeping status as:', listing.status);
            }
            
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

  /**
   * Admin: Approve a listing (change status from PENDING_REVIEW to ACTIVE)
   */
  async approveListing(listingId: string): Promise<ListingResponseDto> {
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatusEnum.PENDING_REVIEW) {
      throw new BadRequestException(`Listing is not in PENDING_REVIEW status. Current status: ${listing.status}`);
    }

    const updateData: Partial<Listing> = {
      status: ListingStatusEnum.ACTIVE,
      isActive: true,
    };

    const updatedListing = await this.listingsRepository.update(listingId, updateData);
    
    // Send email notification to user
    this.sendListingApprovedEmail(listing).catch((error) => {
      console.error('Failed to send listing approved email to user:', error);
    });

    // Send email notification to admin (confirmation)
    this.sendListingApprovedAdminEmail(listing).catch((error) => {
      console.error('Failed to send listing approved email to admin:', error);
    });

    return this.transformToListingResponse(updatedListing);
  }

  /**
   * Admin: Reject a listing (change status to SUSPENDED)
   */
  async rejectListing(listingId: string, reason?: string): Promise<ListingResponseDto> {
    const listing = await this.listingsRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatusEnum.PENDING_REVIEW) {
      throw new BadRequestException(`Listing is not in PENDING_REVIEW status. Current status: ${listing.status}`);
    }

    const updateData: Partial<Listing> = {
      status: ListingStatusEnum.SUSPENDED,
      isActive: false,
      suspensionReason: reason || 'Listing rejected by admin',
      suspendedAt: new Date(),
    };

    const updatedListing = await this.listingsRepository.update(listingId, updateData);
    return this.transformToListingResponse(updatedListing);
  }

  /**
   * Send email notification to admin when listing status changes to PENDING_REVIEW
   */
  async sendListingPendingReviewEmail(listing: Listing): Promise<void> {
    try {
      // Get user information
      const user = listing.user || await this.usersService.getUserById(listing.userId);
      if (!user || !user.email) {
        console.warn(`Cannot send pending review email: User not found or has no email for listing ${listing.id}`);
        return;
      }

      // Get admin email from config
      const adminEmail = this.configService.get<string>('contact.supportEmail') || process.env.ADMIN_SUPPORT_EMAIL;
      if (!adminEmail) {
        console.warn('Cannot send pending review email: Admin email not configured');
        return;
      }

      // Get breed name
      const breedName = listing.breedRelation?.name || listing.fields?.breed || listing.metadata?.breed || 'N/A';
      
      // Get location
      const location = listing.fields?.location || listing.metadata?.location || 'N/A';

      // Get listing type display name
      const listingTypeDisplay = this.getListingTypeDisplayName(listing.type);

      // Build review URL
      const siteUrl = this.configService.get<string>('siteUrl') || process.env.SITE_URL || 'http://localhost:3000';
      const reviewUrl = `${siteUrl}/admin/listings`;

      await this.emailService.sendEmailWithTemplate({
        recipient: adminEmail,
        templateAlias: postmarkEmailTemplates.listingPendingReview,
        dynamicTemplateData: {
          logoUrl: images.logo,
          listingId: listing.id,
          listingTitle: listing.title,
          listingType: listingTypeDisplay,
          breed: breedName,
          location: location,
          userName: user.name || 'Unknown User',
          userEmail: user.email,
          reviewUrl: reviewUrl,
        },
      });
    } catch (error) {
      console.error('Error sending pending review email:', error);
      // Don't throw - email failure shouldn't break the flow
    }
  }

  /**
   * Send email notification to user when listing is approved
   */
  async sendListingApprovedEmail(listing: Listing): Promise<void> {
    try {
      // Get user information
      const user = listing.user || await this.usersService.getUserById(listing.userId);
      if (!user || !user.email) {
        console.warn(`Cannot send approved email: User not found or has no email for listing ${listing.id}`);
        return;
      }

      // Get breed name
      const breedName = listing.breedRelation?.name || listing.fields?.breed || listing.metadata?.breed || 'N/A';
      
      // Get location
      const location = listing.fields?.location || listing.metadata?.location || 'N/A';

      // Get listing type display name
      const listingTypeDisplay = this.getListingTypeDisplayName(listing.type);

      // Build listing URL
      const siteUrl = this.configService.get<string>('siteUrl') || process.env.SITE_URL || 'http://localhost:3000';
      const listingUrl = `${siteUrl}/explore/${listing.id}`;

      await this.emailService.sendEmailWithTemplate({
        recipient: user.email,
        templateAlias: postmarkEmailTemplates.listingApproved,
        dynamicTemplateData: {
          logoUrl: images.logo,
          userName: user.name || 'User',
          listingTitle: listing.title,
          listingType: listingTypeDisplay,
          breed: breedName,
          location: location,
          listingUrl: listingUrl,
        },
      });
    } catch (error) {
      console.error('Error sending approved email:', error);
      // Don't throw - email failure shouldn't break the flow
    }
  }

  /**
   * Send email notification to admin when listing is approved (confirmation)
   */
  async sendListingApprovedAdminEmail(listing: Listing): Promise<void> {
    try {
      // Get user information
      const user = listing.user || await this.usersService.getUserById(listing.userId);
      if (!user) {
        console.warn(`Cannot send approved admin email: User not found for listing ${listing.id}`);
        return;
      }

      // Get admin email from config
      const adminEmail = this.configService.get<string>('contact.supportEmail') || process.env.ADMIN_SUPPORT_EMAIL;
      if (!adminEmail) {
        console.warn('Cannot send approved admin email: Admin email not configured');
        return;
      }

      // Get breed name
      const breedName = listing.breedRelation?.name || listing.fields?.breed || listing.metadata?.breed || 'N/A';
      
      // Get location
      const location = listing.fields?.location || listing.metadata?.location || 'N/A';

      // Get listing type display name
      const listingTypeDisplay = this.getListingTypeDisplayName(listing.type);

      // Build listing URL
      const siteUrl = this.configService.get<string>('siteUrl') || process.env.SITE_URL || 'http://localhost:3000';
      const listingUrl = `${siteUrl}/explore/${listing.id}`;

      await this.emailService.sendEmailWithTemplate({
        recipient: adminEmail,
        templateAlias: postmarkEmailTemplates.listingApprovedAdmin,
        dynamicTemplateData: {
          logoUrl: images.logo,
          listingId: listing.id,
          listingTitle: listing.title,
          listingType: listingTypeDisplay,
          breed: breedName,
          location: location,
          userName: user.name || 'Unknown User',
          userEmail: user.email || 'N/A',
          listingUrl: listingUrl,
        },
      });
    } catch (error) {
      console.error('Error sending approved admin email:', error);
      // Don't throw - email failure shouldn't break the flow
    }
  }

  /**
   * Helper method to get display name for listing type
   */
  private getListingTypeDisplayName(type: ListingTypeEnum): string {
    const typeMap: Record<ListingTypeEnum, string> = {
      [ListingTypeEnum.PUPPY_LISTING]: 'Puppy Listing',
      [ListingTypeEnum.PUPPY_LITTER_LISTING]: 'Puppy Litter Listing',
      [ListingTypeEnum.LITTER_LISTING]: 'Litter Listing',
      [ListingTypeEnum.STUD_LISTING]: 'Stud Listing',
      [ListingTypeEnum.FUTURE_LISTING]: 'Future Listing',
      [ListingTypeEnum.WANTED_LISTING]: 'Wanted Listing',
      [ListingTypeEnum.SEMEN_LISTING]: 'Semen Listing',
      [ListingTypeEnum.OTHER_SERVICES]: 'Other Services',
    };
    return typeMap[type] || type;
  }
} 