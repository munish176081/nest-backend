import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, ILike, Between, In, IsNull, Not } from 'typeorm';
import { Listing, ListingTypeEnum, ListingCategoryEnum, ListingStatusEnum } from './entities/listing.entity';
import { QueryListingDto } from './dto/query-listing.dto';
import { SearchListingDto } from './dto/query-listing.dto';

@Injectable()
export class ListingsRepository {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  async create(listingData: Partial<Listing>): Promise<Listing> {
    const listing = this.listingRepository.create(listingData);
    return await this.listingRepository.save(listing);
  }

  async findById(id: string, includeUser = true): Promise<Listing | null> {
    const query = this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.breedRelation', 'breed');
    
    if (includeUser) {
      query.leftJoinAndSelect('listing.user', 'user');
    }
    
    return await query.where('listing.id = :id', { id }).getOne();
  }

  async findByUserId(userId: string, options?: {
    status?: ListingStatusEnum;
    includeExpired?: boolean;
    includeDrafts?: boolean;
  }): Promise<Listing[]> {
    const query = this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.breedRelation', 'breed')
      .where('listing.userId = :userId', { userId });

    // Always exclude deleted listings unless specifically requested
    query.andWhere('listing.status != :deleted', { deleted: ListingStatusEnum.DELETED });

    if (options?.status) {
      query.andWhere('listing.status = :status', { status: options.status });
    }

    if (!options?.includeExpired) {
      query.andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > NOW())');
    }

    if (!options?.includeDrafts) {
      query.andWhere('listing.status != :draft', { draft: ListingStatusEnum.DRAFT });
    }

    return await query.orderBy('listing.createdAt', 'DESC').getMany();
  }

  async findActiveListings(queryDto: QueryListingDto): Promise<{
    listings: Listing[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.buildQueryBuilder(queryDto);
    
    // Debug: Log the generated SQL
    console.log('🔍 Generated SQL:', queryBuilder.getSql());
    console.log('🔍 Query parameters:', queryBuilder.getParameters());
    
    const [listings, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(`listing.${sortBy}`, sortOrder)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      listings,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async searchListings(searchDto: SearchListingDto): Promise<{
    listings: Listing[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { query, page = 1, limit = 20 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.breedRelation', 'breed')
      .where('listing.status = :status', { status: ListingStatusEnum.ACTIVE })
      .andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > NOW())')
      .andWhere(
        '(listing.title ILIKE :query OR listing.description ILIKE :query OR listing.breed ILIKE :query OR listing.location ILIKE :query)',
        { query: `%${query}%` }
      );

    if (searchDto.type) {
      queryBuilder.andWhere('listing.type = :type', { type: searchDto.type });
    }

    if (searchDto.category) {
      queryBuilder.andWhere('listing.category = :category', { category: searchDto.category });
    }

    if (searchDto.location) {
      queryBuilder.andWhere('listing.location ILIKE :location', { location: `%${searchDto.location}%` });
    }

    // Price type filter
    if (searchDto.priceType) {
      switch (searchDto.priceType) {
        case 'price_on_request':
          // Listings with no price or pricingOption set to 'priceOnRequest'
          queryBuilder.andWhere(
            '(listing.price IS NULL OR listing.fields->>\'pricingOption\' = \'priceOnRequest\')'
          );
          break;
        case 'price_range':
          // Listings with pricingOption set to 'displayPriceRange' and both minPrice and maxPrice
          queryBuilder.andWhere(
            'listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
            'listing.fields->\'minPrice\' IS NOT NULL AND ' +
            'listing.fields->\'maxPrice\' IS NOT NULL'
          );
          break;
        case 'price_available':
          // Listings with a fixed price (not null) and not using price range
          queryBuilder.andWhere(
            'listing.price IS NOT NULL AND ' +
            '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\')'
          );
          break;
      }
    }

    const [listings, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('listing.isFeatured', 'DESC')
      .addOrderBy('listing.createdAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      listings,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async update(id: string, updateData: Partial<Listing>): Promise<Listing | null> {
    await this.listingRepository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.listingRepository.delete(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.listingRepository.update(id, { 
      status: ListingStatusEnum.DELETED,
      isActive: false 
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.listingRepository.increment({ id }, 'viewCount', 1);
  }

  async incrementFavoriteCount(id: string): Promise<void> {
    await this.listingRepository.increment({ id }, 'favoriteCount', 1);
  }

  async decrementFavoriteCount(id: string): Promise<void> {
    await this.listingRepository.decrement({ id }, 'favoriteCount', 1);
  }

  async incrementContactCount(id: string): Promise<void> {
    await this.listingRepository.increment({ id }, 'contactCount', 1);
  }

  async findExpiredListings(): Promise<Listing[]> {
    return await this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.breedRelation', 'breed')
      .where('listing.expiresAt IS NOT NULL')
      .andWhere('listing.status = :status', { status: ListingStatusEnum.ACTIVE })
      .getMany();
  }

  async findFeaturedListings(limit = 10): Promise<Listing[]> {
    return await this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.breedRelation', 'breed')
      .where('listing.isFeatured = :isFeatured', { isFeatured: true })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.ACTIVE })
      .andWhere('listing.isActive = :isActive', { isActive: true })
      .orderBy('listing.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async findPremiumListings(limit = 10): Promise<Listing[]> {
    return await this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.breedRelation', 'breed')
      .where('listing.isPremium = :isPremium', { isPremium: true })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.ACTIVE })
      .andWhere('listing.isActive = :isActive', { isActive: true })
      .orderBy('listing.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getListingStats(userId?: string): Promise<{
    total: number;
    active: number;
    draft: number;
    expired: number;
    featured: number;
    premium: number;
  }> {
    const queryBuilder = this.listingRepository.createQueryBuilder('listing');

    if (userId) {
      queryBuilder.where('listing.userId = :userId', { userId });
    }

    const [
      total,
      active,
      draft,
      expired,
      featured,
      premium,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.where('listing.status = :status', { status: ListingStatusEnum.ACTIVE }).getCount(),
      queryBuilder.where('listing.status = :status', { status: ListingStatusEnum.DRAFT }).getCount(),
      queryBuilder.where('listing.expiresAt < NOW()').getCount(),
      queryBuilder.where('listing.isFeatured = :featured', { featured: true }).getCount(),
      queryBuilder.where('listing.isPremium = :premium', { premium: true }).getCount(),
    ]);

    return {
      total,
      active,
      draft,
      expired,
      featured,
      premium,
    };
  }

  private buildQueryBuilder(queryDto: QueryListingDto): SelectQueryBuilder<Listing> {
    const queryBuilder = this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.breedRelation', 'breed');

    // Base filters
    if (queryDto.status) {
      queryBuilder.andWhere('listing.status = :status', { status: queryDto.status });
    } else {
      // Default to active listings if no specific status
      queryBuilder.andWhere('listing.status = :status', { status: ListingStatusEnum.ACTIVE });
    }

    if (!queryDto.includeExpired) {
      queryBuilder.andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > NOW())');
    }

    // Search
    if (queryDto.search) {
      queryBuilder.andWhere(
        '(listing.title ILIKE :search OR listing.description ILIKE :search OR listing.breed ILIKE :search OR listing.location ILIKE :search)',
        { search: `%${queryDto.search}%` }
      );
    }

    // Type filter
    if (queryDto.type) {
      queryBuilder.andWhere('listing.type = :type', { type: queryDto.type });
    }

    // Types filter (multiple types)
    if (queryDto.types && queryDto.types.length > 0) {
      queryBuilder.andWhere('listing.type IN (:...types)', { types: queryDto.types });
    }

    // Category filter
    if (queryDto.category) {
      queryBuilder.andWhere('listing.category = :category', { category: queryDto.category });
    }

    // Status filter
    if (queryDto.status) {
      queryBuilder.andWhere('listing.status = :status', { status: queryDto.status });
    }

    // Breed filter
    if (queryDto.breed) {
      queryBuilder.andWhere('listing.breed ILIKE :breed', { breed: `%${queryDto.breed}%` });
    }

    // Location filter
    if (queryDto.location) {
      queryBuilder.andWhere('listing.location ILIKE :location', { location: `%${queryDto.location}%` });
    }

    // Price range
    if (queryDto.minPrice !== undefined) {
      queryBuilder.andWhere('listing.price >= :minPrice', { minPrice: queryDto.minPrice });
    }

    if (queryDto.maxPrice !== undefined) {
      queryBuilder.andWhere('listing.price <= :maxPrice', { maxPrice: queryDto.maxPrice });
    }

    // Price type filter
    if (queryDto.priceType) {
      switch (queryDto.priceType) {
        case 'price_on_request':
          // Listings with no price or pricingOption set to 'priceOnRequest'
          queryBuilder.andWhere(
            '(listing.price IS NULL OR listing.fields->>\'pricingOption\' = \'priceOnRequest\')'
          );
          break;
        case 'price_range':
          // Listings with pricingOption set to 'displayPriceRange' and both minPrice and maxPrice
          queryBuilder.andWhere(
            'listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
            'listing.fields->\'minPrice\' IS NOT NULL AND ' +
            'listing.fields->\'maxPrice\' IS NOT NULL'
          );
          break;
        case 'price_available':
          // Listings with a fixed price (not null) and not using price range
          queryBuilder.andWhere(
            'listing.price IS NOT NULL AND ' +
            '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\')'
          );
          break;
      }
    }

    // Featured filter
    if (queryDto.isFeatured !== undefined) {
      queryBuilder.andWhere('listing.isFeatured = :isFeatured', { isFeatured: queryDto.isFeatured });
    }

    // Premium filter
    if (queryDto.isPremium !== undefined) {
      queryBuilder.andWhere('listing.isPremium = :isPremium', { isPremium: queryDto.isPremium });
    }

    // Tags filter
    if (queryDto.tags && queryDto.tags.length > 0) {
      queryBuilder.andWhere('listing.metadata->\'tags\' ?| array[:...tags]', { tags: queryDto.tags });
    }

    // User filter
    if (queryDto.userId) {
      queryBuilder.andWhere('listing.userId = :userId', { userId: queryDto.userId });
    }

    // Exclude specific listing ID
    if (queryDto.excludeId) {
      queryBuilder.andWhere('listing.id != :excludeId', { excludeId: queryDto.excludeId });
    }

    return queryBuilder;
  }
} 