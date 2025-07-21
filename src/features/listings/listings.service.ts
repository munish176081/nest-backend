import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ListingsRepository } from './listings.repository';
import { CreateListingDto, UpdateListingDto } from './dto';
import { QueryListingDto, SearchListingDto } from './dto/query-listing.dto';
import { Listing, ListingStatusEnum, ListingTypeEnum, ListingAvailabilityEnum } from './entities/listing.entity';
import { ListingResponseDto, ListingSummaryDto, PaginatedListingsResponseDto } from './dto/response-listing.dto';

@Injectable()
export class ListingsService {
  constructor(
    private readonly listingsRepository: ListingsRepository,
  ) {}

  async createListing(userId: string, createListingDto: CreateListingDto): Promise<ListingResponseDto> {
    // Validate listing type and category
    this.validateListingTypeAndCategory(createListingDto.type, createListingDto.category);

    // Process and validate dynamic fields based on listing type
    const processedFields = createListingDto.fields ? await this.processListingFields(createListingDto.type, createListingDto.fields) : {};

    // Build metadata object
    const metadata: Record<string, any> = {
      contactInfo: createListingDto.contactInfo,
      images: createListingDto.images || [],
      videos: createListingDto.videos || [],
      documents: createListingDto.documents || [],
      tags: createListingDto.tags || [],
      featured: createListingDto.isFeatured || false,
      premium: createListingDto.isPremium || false,
    };

    // Calculate expiration date based on listing type
    const expiresAt = this.calculateExpirationDate(createListingDto.type, createListingDto.expiresAt);

    const listingData: Partial<Listing> = {
      userId,
      type: createListingDto.type,
      category: createListingDto.category,
      title: createListingDto.title,
      description: createListingDto.description,
      fields: processedFields,
      metadata,
      price: createListingDto.price,
      breed: createListingDto.breed,
      location: createListingDto.location,
      expiresAt,
      startedOrRenewedAt: new Date(),
      status: ListingStatusEnum.ACTIVE,
      isActive: true,
      seoData: createListingDto.seoData,
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
    }

    // Handle metadata updates
    let metadata = listing.metadata || {};
    
    // Update contact info
    if (updateListingDto.contactInfo) {
      metadata.contactInfo = updateListingDto.contactInfo;
    }
    
    // Update media files
    if (updateListingDto.images) {
      metadata.images = updateListingDto.images;
    }
    if (updateListingDto.videos) {
      metadata.videos = updateListingDto.videos;
    }
    if (updateListingDto.documents) {
      metadata.documents = updateListingDto.documents;
    }
    
    // Update tags
    if (updateListingDto.tags) {
      metadata.tags = updateListingDto.tags;
    }

    const updateData: Partial<Listing> = {
      title: updateListingDto.title,
      description: updateListingDto.description,
      price: updateListingDto.price,
      breed: updateListingDto.breed,
      location: updateListingDto.location,
      fields: processedFields,
      metadata,
      expiresAt: updateListingDto.expiresAt ? new Date(updateListingDto.expiresAt) : undefined,
      seoData: updateListingDto.seoData,
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
    // Add type-specific field processing here
    // For now, just return the fields as-is
    return fields;
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

  private transformToListingResponse(listing: Listing): ListingResponseDto {
    return {
      id: listing.id,
      userId: listing.userId,
      type: listing.type,
      status: listing.status,
      category: listing.category,
      title: listing.title,
      description: listing.description,
      fields: listing.fields,
      metadata: listing.metadata,
      price: listing.price,
      breed: listing.breed,
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
      user: listing.user,
    };
  }

  private transformToListingSummary(listing: Listing): ListingSummaryDto {
    return {
      id: listing.id,
      type: listing.type,
      status: listing.status,
      category: listing.category,
      title: listing.title,
      price: listing.price,
      breed: listing.breed,
      location: listing.location,
      featuredImage: listing.metadata?.images?.[0] || null,
      metadata: listing.metadata || {},
      viewCount: listing.viewCount,
      favoriteCount: listing.favoriteCount,
      isFeatured: listing.isFeatured,
      isPremium: listing.isPremium,
      createdAt: listing.createdAt,
      availability: listing.availability,
      user: listing.user,
    };
  }
} 