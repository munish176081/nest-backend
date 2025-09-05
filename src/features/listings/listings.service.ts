import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ListingsRepository } from './listings.repository';
import { CreateListingDto, UpdateListingDto } from './dto';
import { QueryListingDto, SearchListingDto } from './dto/query-listing.dto';
import { Listing, ListingStatusEnum, ListingTypeEnum, ListingAvailabilityEnum } from './entities/listing.entity';
import { ListingResponseDto, ListingSummaryDto, PaginatedListingsResponseDto } from './dto/response-listing.dto';
import { BreedsService } from '../breeds/breeds.service';
import { calculateAge } from '../../helpers/date';
import { UsersService } from '../accounts/users.service';

@Injectable()
export class ListingsService {
  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly breedsService: BreedsService,
    private readonly usersService: UsersService,
  ) { }

  async createListing(createListingDto: CreateListingDto, userId: string): Promise<ListingResponseDto> {
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
      status: ListingStatusEnum.ACTIVE,
      isActive: true,
      seoData: createListingDto.seoData,
      motherInfo: createListingDto.motherInfo,
      fatherInfo: createListingDto.fatherInfo,
    };

    const listing = await this.listingsRepository.create(listingData);
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
    };

    const updatedListing = await this.listingsRepository.update(listingId, updateData);
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
    const result = await this.listingsRepository.findActiveListings(queryDto);

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
    
    // Calculate age from dateOfBirth if present
    if (processedFields.dateOfBirth) {
      processedFields.age = calculateAge(processedFields.dateOfBirth);
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
    // Calculate age from dateOfBirth if present in fields
    let calculatedAge = '';
    if (listing.fields?.dateOfBirth) {
      calculatedAge = calculateAge(listing.fields.dateOfBirth);
    }

    const user = await this.usersService.getUserById(listing.userId);
    
    // Transform user object to only include necessary fields
    const transformedUser = user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
    } : null;
    
    const transformedFields = {
      ...listing.fields,
      age: calculatedAge || listing.fields?.age || '',
    };

    return {
      id: listing.id,
      userId: listing.userId,
      type: listing.type,
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
      user: transformedUser,
    };
  }

  private transformToListingSummary(listing: Listing): ListingSummaryDto {
    // Calculate age from dateOfBirth if present in fields
    let calculatedAge = '';
    if (listing.fields?.dateOfBirth) {
      calculatedAge = calculateAge(listing.fields.dateOfBirth);
    }
    
    // Debug logging for user relation
    console.log('🔍 Transform debug:', {
      listingId: listing.id,
      listingUserId: listing.userId,
      userRelation: listing.user,
      hasUser: !!listing.user,
      userName: listing.user?.name,
      userEmail: listing.user?.email
    });
    
    // Transform user object to only include necessary fields
    const transformedUser = listing.user ? {
      id: listing.user.id,
      name: listing.user.name,
    } : null;
    
    return {
      id: listing.id,
      type: listing.type,
      status: listing.status,
      category: listing.category,
      title: listing.title,
      price: listing.price,
      breed: listing.breed,
      description: listing.description,
      breedId: listing.breedId,
      breedName: listing.breedRelation?.name || listing.breed,
      location: listing.location,
      featuredImage: listing.metadata?.images?.[0] || null,
      metadata: listing.metadata || {},
      viewCount: listing.viewCount,
      favoriteCount: listing.favoriteCount,
      isFeatured: listing.isFeatured,
      isPremium: listing.isPremium,
      createdAt: listing.createdAt,
      availability: listing.availability,
      user: transformedUser,
      // Add calculated age to summary
      age: calculatedAge || listing.fields?.age || '',
    };
  }
} 