import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, ILike, Between, In, IsNull, Not } from 'typeorm';
import { Listing, ListingTypeEnum, ListingCategoryEnum, ListingStatusEnum } from './entities/listing.entity';
import { QueryListingDto } from './dto/query-listing.dto';
import { SearchListingDto } from './dto/query-listing.dto';
import { Subscription, SubscriptionStatusEnum } from '../subscriptions/entities/subscription.entity';

@Injectable()
export class ListingsRepository {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
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
  }): Promise<(Listing & { subscriptionRenewalDate?: Date })[]> {
    const listings = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.breedRelation', 'breed')
      .where('listing.userId = :userId', { userId })
      .getMany();

    // Always exclude deleted listings unless specifically requested
    let filteredListings = listings.filter(l => l.status !== ListingStatusEnum.DELETED);

    if (options?.status) {
      filteredListings = filteredListings.filter(l => l.status === options.status);
    }

    if (!options?.includeExpired) {
      filteredListings = filteredListings.filter(l => !l.expiresAt || l.expiresAt > new Date());
    }

    if (!options?.includeDrafts) {
      filteredListings = filteredListings.filter(l => l.status !== ListingStatusEnum.DRAFT);
    }

    // Fetch subscriptions linked to these listings (by listingId) to find missing subscriptionIds
    const listingIdsForSubscriptionCheck = filteredListings.map(l => l.id);
    const subscriptionsByListingId = await this.subscriptionRepository.find({
      where: { listingId: In(listingIdsForSubscriptionCheck) },
      select: ['id', 'listingId', 'currentPeriodEnd', 'status'],
    });

    // Create maps for subscription data
    const subscriptionByListingIdMap = new Map(
      subscriptionsByListingId.map(s => [s.listingId, s])
    );
    const subscriptionRenewalDateMap = new Map(
      subscriptionsByListingId.map(s => [s.listingId, s.currentPeriodEnd])
    );

    // Also fetch subscriptions by subscriptionId for listings that already have it
    const existingSubscriptionIds = filteredListings
      .filter(l => l.subscriptionId)
      .map(l => l.subscriptionId);

    if (existingSubscriptionIds.length > 0) {
      const subscriptionsById = await this.subscriptionRepository.find({
        where: { id: In(existingSubscriptionIds), status: SubscriptionStatusEnum.ACTIVE },
        select: ['id', 'currentPeriodEnd'],
      });

      subscriptionsById.forEach(s => {
        subscriptionRenewalDateMap.set(s.id, s.currentPeriodEnd);
      });
    }

    // Add subscriptionId and renewal date to listings
    filteredListings = filteredListings.map(listing => {
      const subscription = subscriptionByListingIdMap.get(listing.id);
      const subscriptionId = listing.subscriptionId || (subscription ? subscription.id : null);
      const renewalDate = subscriptionId 
        ? (subscriptionRenewalDateMap.get(listing.id) || subscriptionRenewalDateMap.get(subscriptionId))
        : undefined;

      return {
        ...listing,
        subscriptionId, // Populate subscriptionId if it was missing
        subscriptionRenewalDate: renewalDate,
      };
    });

    return filteredListings.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

  async findAdminListings(queryDto: QueryListingDto): Promise<{
    listings: Listing[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.buildAdminQueryBuilder(queryDto);
    
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
      .andWhere('listing.isActive = :isActive', { isActive: true })
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

    // Price type filter - support both single priceType and multiple priceTypes
    const priceTypes = searchDto.priceTypes || (searchDto.priceType ? [searchDto.priceType] : []);
    if (priceTypes.length > 0) {
      const priceTypeConditions = priceTypes.map(priceType => {
        switch (priceType) {
          case 'price_on_request':
            // Only show listings that are EXPLICITLY marked as price on request
            // Exclude listings that have a price (in listing.price OR fields.startingPrice)
            // Exclude WANTED_LISTING type (they have budgets, not prices)
            // Exclude OTHER_SERVICES without startingPrice (incomplete data, not price on request)
            return '(listing.fields->>\'pricingOption\' = \'priceOnRequest\')';
          case 'price_range':
            // Listings with pricingOption set to 'displayPriceRange' and both minPrice and maxPrice
            return 'listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
                   'listing.fields->\'minPrice\' IS NOT NULL AND ' +
                   'listing.fields->\'maxPrice\' IS NOT NULL';
          case 'price_available':
            // Listings with a fixed price (not null) and not using price range
            return 'listing.price IS NOT NULL AND ' +
                   '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\')';
          default:
            return null;
        }
      }).filter(condition => condition !== null);

      if (priceTypeConditions.length > 0) {
        queryBuilder.andWhere(`(${priceTypeConditions.join(' OR ')})`);
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
      .innerJoin(
        'subscriptions',
        'subscription',
        'subscription.listing_id = listing.id'
      )
      .where('subscription.includes_featured = :includesFeatured', { includesFeatured: true })
      .andWhere('subscription.status = :subscriptionStatus', { subscriptionStatus: SubscriptionStatusEnum.ACTIVE })
      .andWhere('subscription.current_period_end > NOW()')
      .andWhere('listing.status = :status', { status: ListingStatusEnum.ACTIVE })
      .andWhere('listing.isActive = :isActive', { isActive: true })
      .distinct(true)
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

    // Filter out inactive/expired listings from public queries (unless userId is specified, which means it's a private query)
    if (!queryDto.userId) {
      queryBuilder.andWhere('listing.isActive = :isActive', { isActive: true });
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

    // Breed filter - check both direct breed field and breed relation
    if (queryDto.breed) {
      queryBuilder.andWhere(
        '(listing.breed ILIKE :breed OR breed.name ILIKE :breed)',
        { breed: `%${queryDto.breed}%` }
      );
    }

    // Location filter
    if (queryDto.location) {
      queryBuilder.andWhere('listing.location ILIKE :location', { location: `%${queryDto.location}%` });
    }

    // Gender filter (for stud/bitch listings)
    if (queryDto.gender) {
      queryBuilder.andWhere('listing.fields->>\'gender\' = :gender', { gender: queryDto.gender });
    }

    // Price type filter - support both single priceType and multiple priceTypes
    const priceTypes = queryDto.priceTypes || (queryDto.priceType ? [queryDto.priceType] : []);
    if (priceTypes.length > 0) {
      const priceTypeConditions = priceTypes.map(priceType => {
        switch (priceType) {
          case 'price_on_request':
            // Only show listings that are EXPLICITLY marked as price on request
            // Exclude listings that have a price (in listing.price OR fields.startingPrice)
            // Exclude WANTED_LISTING type (they have budgets, not prices)
            // Exclude OTHER_SERVICES without startingPrice (incomplete data, not price on request)
            return '(listing.fields->>\'pricingOption\' = \'priceOnRequest\')';
          case 'price_range':
            // Listings with pricingOption set to 'displayPriceRange' and both minPrice and maxPrice
            return 'listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
                   'listing.fields->\'minPrice\' IS NOT NULL AND ' +
                   'listing.fields->\'maxPrice\' IS NOT NULL';
          case 'price_available':
            // Listings with a fixed price (not null) and not using price range
            return 'listing.price IS NOT NULL AND ' +
                   '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\')';
          default:
            return null;
        }
      }).filter(condition => condition !== null);

      if (priceTypeConditions.length > 0) {
        queryBuilder.andWhere(`(${priceTypeConditions.join(' OR ')})`);
      }
    }

    // Price range - handle both fixed prices and price ranges
    // Only apply price range filter when:
    // 1. No price types are selected (show all listings within price range), OR
    // 2. Price types with actual prices are selected (price_available or price_range)
    // Don't apply when only price_on_request is selected (those listings don't have prices)
    const hasPriceTypes = priceTypes.length > 0;
    const onlyPriceOnRequest = hasPriceTypes && priceTypes.length === 1 && priceTypes.includes('price_on_request');
    const hasPriceRangeTypes = hasPriceTypes && (priceTypes.includes('price_available') || priceTypes.includes('price_range'));
    
    if ((queryDto.minPrice !== undefined || queryDto.maxPrice !== undefined) && (!hasPriceTypes || hasPriceRangeTypes)) {
      const priceConditions: string[] = [];
      const priceParams: Record<string, any> = {};

      // Fixed price listings (price_available)
      if (priceTypes.includes('price_available')) {
        if (queryDto.minPrice !== undefined && queryDto.maxPrice !== undefined) {
          priceConditions.push(
            '(listing.price IS NOT NULL AND listing.price >= :minPrice AND listing.price <= :maxPrice AND ' +
            '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\'))'
          );
          priceParams.minPrice = queryDto.minPrice;
          priceParams.maxPrice = queryDto.maxPrice;
        } else if (queryDto.minPrice !== undefined) {
          priceConditions.push(
            '(listing.price IS NOT NULL AND listing.price >= :minPrice AND ' +
            '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\'))'
          );
          priceParams.minPrice = queryDto.minPrice;
        } else if (queryDto.maxPrice !== undefined) {
          priceConditions.push(
            '(listing.price IS NOT NULL AND listing.price <= :maxPrice AND ' +
            '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\'))'
          );
          priceParams.maxPrice = queryDto.maxPrice;
        }
      }

      // Price range listings (check if the range overlaps with the filter)
      if (priceTypes.includes('price_range')) {
        if (queryDto.maxPrice !== undefined) {
          priceConditions.push(
            '(listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
            'listing.fields->\'minPrice\' IS NOT NULL AND ' +
            '(listing.fields->>\'minPrice\')::numeric <= :maxPrice)'
          );
          if (!priceParams.maxPrice) {
            priceParams.maxPrice = queryDto.maxPrice;
          }
        }
        if (queryDto.minPrice !== undefined) {
          priceConditions.push(
            '(listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
            'listing.fields->\'maxPrice\' IS NOT NULL AND ' +
            '(listing.fields->>\'maxPrice\')::numeric >= :minPrice)'
          );
          if (!priceParams.minPrice) {
            priceParams.minPrice = queryDto.minPrice;
          }
        }
      }

      if (priceConditions.length > 0) {
        queryBuilder.andWhere(`(${priceConditions.join(' OR ')})`, priceParams);
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

    // Exclude listings with subscriptions that have amount = 128 AND includes_featured = true
    // This filters out listings with $128 featured subscriptions
    console.log('excludeFeaturedSubscriptions', queryDto.excludeFeaturedSubscriptions);
    if (queryDto.excludeFeaturedSubscriptions) {
      console.log('Excluding listings with $128 featured subscriptions');
    queryBuilder.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM subscriptions subscription
        WHERE subscription.listing_id = listing.id
        AND subscription.amount = :excludeAmount
        AND subscription.includes_featured = true
        AND subscription.status = :subscriptionStatus
        AND subscription.current_period_end > NOW()
      )`,
      {
        excludeAmount: 128,
        subscriptionStatus: SubscriptionStatusEnum.ACTIVE,
      }
    );
  }

    return queryBuilder;
  }

  private buildAdminQueryBuilder(queryDto: QueryListingDto): SelectQueryBuilder<Listing> {
    const queryBuilder = this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.breedRelation', 'breed');

    // Admin can see all statuses - only filter by status if explicitly provided
    if (queryDto.status) {
      queryBuilder.andWhere('listing.status = :status', { status: queryDto.status });
    }
    // No default status filter for admin - shows all statuses including PENDING_REVIEW

    // Don't filter by isActive for admin - they need to see all listings
    // Admin can see inactive listings too

    // Expired filter - only apply if explicitly requested
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

    // Breed filter - check both direct breed field and breed relation
    if (queryDto.breed) {
      queryBuilder.andWhere(
        '(listing.breed ILIKE :breed OR breed.name ILIKE :breed)',
        { breed: `%${queryDto.breed}%` }
      );
    }

    // Location filter
    if (queryDto.location) {
      queryBuilder.andWhere('listing.location ILIKE :location', { location: `%${queryDto.location}%` });
    }

    // Gender filter (for stud/bitch listings)
    if (queryDto.gender) {
      queryBuilder.andWhere('listing.fields->>\'gender\' = :gender', { gender: queryDto.gender });
    }

    // User filter
    if (queryDto.userId) {
      queryBuilder.andWhere('listing.userId = :userId', { userId: queryDto.userId });
    }

    // Exclude specific listing ID
    if (queryDto.excludeId) {
      queryBuilder.andWhere('listing.id != :excludeId', { excludeId: queryDto.excludeId });
    }

    // Exclude deleted listings
    queryBuilder.andWhere('listing.status != :deleted', { deleted: ListingStatusEnum.DELETED });

    return queryBuilder;
  }
} 