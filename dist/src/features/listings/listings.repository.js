"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const listing_entity_1 = require("./entities/listing.entity");
const subscription_entity_1 = require("../subscriptions/entities/subscription.entity");
let ListingsRepository = class ListingsRepository {
    constructor(listingRepository, subscriptionRepository) {
        this.listingRepository = listingRepository;
        this.subscriptionRepository = subscriptionRepository;
    }
    async create(listingData) {
        const listing = this.listingRepository.create(listingData);
        return await this.listingRepository.save(listing);
    }
    async findById(id, includeUser = true) {
        const query = this.listingRepository.createQueryBuilder('listing')
            .leftJoinAndSelect('listing.breedRelation', 'breed');
        if (includeUser) {
            query.leftJoinAndSelect('listing.user', 'user');
        }
        return await query.where('listing.id = :id', { id }).getOne();
    }
    async findByUserId(userId, options) {
        const listings = await this.listingRepository
            .createQueryBuilder('listing')
            .leftJoinAndSelect('listing.user', 'user')
            .leftJoinAndSelect('listing.breedRelation', 'breed')
            .where('listing.userId = :userId', { userId })
            .getMany();
        let filteredListings = listings.filter(l => l.status !== listing_entity_1.ListingStatusEnum.DELETED);
        if (options?.status) {
            filteredListings = filteredListings.filter(l => l.status === options.status);
        }
        if (!options?.includeExpired) {
            filteredListings = filteredListings.filter(l => !l.expiresAt || l.expiresAt > new Date());
        }
        if (!options?.includeDrafts) {
            filteredListings = filteredListings.filter(l => l.status !== listing_entity_1.ListingStatusEnum.DRAFT);
        }
        const listingIdsForSubscriptionCheck = filteredListings.map(l => l.id);
        const subscriptionsByListingId = await this.subscriptionRepository.find({
            where: { listingId: (0, typeorm_2.In)(listingIdsForSubscriptionCheck) },
            select: ['id', 'listingId', 'currentPeriodEnd', 'status'],
        });
        const subscriptionByListingIdMap = new Map(subscriptionsByListingId.map(s => [s.listingId, s]));
        const subscriptionRenewalDateMap = new Map(subscriptionsByListingId.map(s => [s.listingId, s.currentPeriodEnd]));
        const existingSubscriptionIds = filteredListings
            .filter(l => l.subscriptionId)
            .map(l => l.subscriptionId);
        if (existingSubscriptionIds.length > 0) {
            const subscriptionsById = await this.subscriptionRepository.find({
                where: { id: (0, typeorm_2.In)(existingSubscriptionIds), status: subscription_entity_1.SubscriptionStatusEnum.ACTIVE },
                select: ['id', 'currentPeriodEnd'],
            });
            subscriptionsById.forEach(s => {
                subscriptionRenewalDateMap.set(s.id, s.currentPeriodEnd);
            });
        }
        filteredListings = filteredListings.map(listing => {
            const subscription = subscriptionByListingIdMap.get(listing.id);
            const subscriptionId = listing.subscriptionId || (subscription ? subscription.id : null);
            const renewalDate = subscriptionId
                ? (subscriptionRenewalDateMap.get(listing.id) || subscriptionRenewalDateMap.get(subscriptionId))
                : undefined;
            return {
                ...listing,
                subscriptionId,
                subscriptionRenewalDate: renewalDate,
            };
        });
        return filteredListings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findActiveListings(queryDto) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = queryDto;
        const skip = (page - 1) * limit;
        const queryBuilder = this.buildQueryBuilder(queryDto);
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
    async findAdminListings(queryDto) {
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
    async searchListings(searchDto) {
        const { query, page = 1, limit = 20 } = searchDto;
        const skip = (page - 1) * limit;
        const queryBuilder = this.listingRepository.createQueryBuilder('listing')
            .leftJoinAndSelect('listing.user', 'user')
            .leftJoinAndSelect('listing.breedRelation', 'breed')
            .where('listing.status = :status', { status: listing_entity_1.ListingStatusEnum.ACTIVE })
            .andWhere('listing.isActive = :isActive', { isActive: true })
            .andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > NOW())')
            .andWhere('(listing.title ILIKE :query OR listing.description ILIKE :query OR listing.breed ILIKE :query OR listing.location ILIKE :query)', { query: `%${query}%` });
        if (searchDto.type) {
            queryBuilder.andWhere('listing.type = :type', { type: searchDto.type });
        }
        if (searchDto.category) {
            queryBuilder.andWhere('listing.category = :category', { category: searchDto.category });
        }
        if (searchDto.location) {
            queryBuilder.andWhere('listing.location ILIKE :location', { location: `%${searchDto.location}%` });
        }
        const priceTypes = searchDto.priceTypes || (searchDto.priceType ? [searchDto.priceType] : []);
        if (priceTypes.length > 0) {
            const priceTypeConditions = priceTypes.map(priceType => {
                switch (priceType) {
                    case 'price_on_request':
                        return '(listing.fields->>\'pricingOption\' = \'priceOnRequest\')';
                    case 'price_range':
                        return 'listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
                            'listing.fields->\'minPrice\' IS NOT NULL AND ' +
                            'listing.fields->\'maxPrice\' IS NOT NULL';
                    case 'price_available':
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
    async update(id, updateData) {
        await this.listingRepository.update(id, updateData);
        return await this.findById(id);
    }
    async delete(id) {
        await this.listingRepository.delete(id);
    }
    async softDelete(id) {
        await this.listingRepository.update(id, {
            status: listing_entity_1.ListingStatusEnum.DELETED,
            isActive: false
        });
    }
    async incrementViewCount(id) {
        await this.listingRepository.increment({ id }, 'viewCount', 1);
    }
    async incrementFavoriteCount(id) {
        await this.listingRepository.increment({ id }, 'favoriteCount', 1);
    }
    async decrementFavoriteCount(id) {
        await this.listingRepository.decrement({ id }, 'favoriteCount', 1);
    }
    async incrementContactCount(id) {
        await this.listingRepository.increment({ id }, 'contactCount', 1);
    }
    async findExpiredListings() {
        return await this.listingRepository.createQueryBuilder('listing')
            .leftJoinAndSelect('listing.user', 'user')
            .leftJoinAndSelect('listing.breedRelation', 'breed')
            .where('listing.expiresAt IS NOT NULL')
            .andWhere('listing.status = :status', { status: listing_entity_1.ListingStatusEnum.ACTIVE })
            .getMany();
    }
    async findFeaturedListings(limit = 10) {
        return await this.listingRepository.createQueryBuilder('listing')
            .leftJoinAndSelect('listing.user', 'user')
            .leftJoinAndSelect('listing.breedRelation', 'breed')
            .innerJoin('subscriptions', 'subscription', 'subscription.listing_id = listing.id')
            .where('subscription.includes_featured = :includesFeatured', { includesFeatured: true })
            .andWhere('subscription.status = :subscriptionStatus', { subscriptionStatus: subscription_entity_1.SubscriptionStatusEnum.ACTIVE })
            .andWhere('subscription.current_period_end > NOW()')
            .andWhere('listing.status = :status', { status: listing_entity_1.ListingStatusEnum.ACTIVE })
            .andWhere('listing.isActive = :isActive', { isActive: true })
            .distinct(true)
            .orderBy('listing.createdAt', 'DESC')
            .take(limit)
            .getMany();
    }
    async findPremiumListings(limit = 10) {
        return await this.listingRepository.createQueryBuilder('listing')
            .leftJoinAndSelect('listing.user', 'user')
            .leftJoinAndSelect('listing.breedRelation', 'breed')
            .where('listing.isPremium = :isPremium', { isPremium: true })
            .andWhere('listing.status = :status', { status: listing_entity_1.ListingStatusEnum.ACTIVE })
            .andWhere('listing.isActive = :isActive', { isActive: true })
            .orderBy('listing.createdAt', 'DESC')
            .take(limit)
            .getMany();
    }
    async getListingStats(userId) {
        const queryBuilder = this.listingRepository.createQueryBuilder('listing');
        if (userId) {
            queryBuilder.where('listing.userId = :userId', { userId });
        }
        const [total, active, draft, expired, featured, premium,] = await Promise.all([
            queryBuilder.getCount(),
            queryBuilder.where('listing.status = :status', { status: listing_entity_1.ListingStatusEnum.ACTIVE }).getCount(),
            queryBuilder.where('listing.status = :status', { status: listing_entity_1.ListingStatusEnum.DRAFT }).getCount(),
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
    buildQueryBuilder(queryDto) {
        const queryBuilder = this.listingRepository.createQueryBuilder('listing')
            .leftJoinAndSelect('listing.user', 'user')
            .leftJoinAndSelect('listing.breedRelation', 'breed');
        if (queryDto.status) {
            queryBuilder.andWhere('listing.status = :status', { status: queryDto.status });
        }
        else {
            queryBuilder.andWhere('listing.status = :status', { status: listing_entity_1.ListingStatusEnum.ACTIVE });
        }
        if (!queryDto.userId) {
            queryBuilder.andWhere('listing.isActive = :isActive', { isActive: true });
        }
        if (!queryDto.includeExpired) {
            queryBuilder.andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > NOW())');
        }
        if (queryDto.search) {
            queryBuilder.andWhere('(listing.title ILIKE :search OR listing.description ILIKE :search OR listing.breed ILIKE :search OR listing.location ILIKE :search)', { search: `%${queryDto.search}%` });
        }
        if (queryDto.type) {
            queryBuilder.andWhere('listing.type = :type', { type: queryDto.type });
        }
        if (queryDto.types && queryDto.types.length > 0) {
            queryBuilder.andWhere('listing.type IN (:...types)', { types: queryDto.types });
        }
        if (queryDto.category) {
            queryBuilder.andWhere('listing.category = :category', { category: queryDto.category });
        }
        if (queryDto.status) {
            queryBuilder.andWhere('listing.status = :status', { status: queryDto.status });
        }
        if (queryDto.breed) {
            queryBuilder.andWhere('(listing.breed ILIKE :breed OR breed.name ILIKE :breed)', { breed: `%${queryDto.breed}%` });
        }
        if (queryDto.location) {
            queryBuilder.andWhere('listing.location ILIKE :location', { location: `%${queryDto.location}%` });
        }
        if (queryDto.gender) {
            queryBuilder.andWhere('listing.fields->>\'gender\' = :gender', { gender: queryDto.gender });
        }
        const priceTypes = queryDto.priceTypes || (queryDto.priceType ? [queryDto.priceType] : []);
        if (priceTypes.length > 0) {
            const priceTypeConditions = priceTypes.map(priceType => {
                switch (priceType) {
                    case 'price_on_request':
                        return '(listing.fields->>\'pricingOption\' = \'priceOnRequest\')';
                    case 'price_range':
                        return 'listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
                            'listing.fields->\'minPrice\' IS NOT NULL AND ' +
                            'listing.fields->\'maxPrice\' IS NOT NULL';
                    case 'price_available':
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
        const hasPriceTypes = priceTypes.length > 0;
        const onlyPriceOnRequest = hasPriceTypes && priceTypes.length === 1 && priceTypes.includes('price_on_request');
        const hasPriceRangeTypes = hasPriceTypes && (priceTypes.includes('price_available') || priceTypes.includes('price_range'));
        if ((queryDto.minPrice !== undefined || queryDto.maxPrice !== undefined) && (!hasPriceTypes || hasPriceRangeTypes)) {
            const priceConditions = [];
            const priceParams = {};
            if (priceTypes.includes('price_available')) {
                if (queryDto.minPrice !== undefined && queryDto.maxPrice !== undefined) {
                    priceConditions.push('(listing.price IS NOT NULL AND listing.price >= :minPrice AND listing.price <= :maxPrice AND ' +
                        '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\'))');
                    priceParams.minPrice = queryDto.minPrice;
                    priceParams.maxPrice = queryDto.maxPrice;
                }
                else if (queryDto.minPrice !== undefined) {
                    priceConditions.push('(listing.price IS NOT NULL AND listing.price >= :minPrice AND ' +
                        '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\'))');
                    priceParams.minPrice = queryDto.minPrice;
                }
                else if (queryDto.maxPrice !== undefined) {
                    priceConditions.push('(listing.price IS NOT NULL AND listing.price <= :maxPrice AND ' +
                        '(listing.fields->>\'pricingOption\' IS NULL OR listing.fields->>\'pricingOption\' != \'displayPriceRange\'))');
                    priceParams.maxPrice = queryDto.maxPrice;
                }
            }
            if (priceTypes.includes('price_range')) {
                if (queryDto.maxPrice !== undefined) {
                    priceConditions.push('(listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
                        'listing.fields->\'minPrice\' IS NOT NULL AND ' +
                        '(listing.fields->>\'minPrice\')::numeric <= :maxPrice)');
                    if (!priceParams.maxPrice) {
                        priceParams.maxPrice = queryDto.maxPrice;
                    }
                }
                if (queryDto.minPrice !== undefined) {
                    priceConditions.push('(listing.fields->>\'pricingOption\' = \'displayPriceRange\' AND ' +
                        'listing.fields->\'maxPrice\' IS NOT NULL AND ' +
                        '(listing.fields->>\'maxPrice\')::numeric >= :minPrice)');
                    if (!priceParams.minPrice) {
                        priceParams.minPrice = queryDto.minPrice;
                    }
                }
            }
            if (priceConditions.length > 0) {
                queryBuilder.andWhere(`(${priceConditions.join(' OR ')})`, priceParams);
            }
        }
        if (queryDto.isFeatured !== undefined) {
            queryBuilder.andWhere('listing.isFeatured = :isFeatured', { isFeatured: queryDto.isFeatured });
        }
        if (queryDto.isPremium !== undefined) {
            queryBuilder.andWhere('listing.isPremium = :isPremium', { isPremium: queryDto.isPremium });
        }
        if (queryDto.tags && queryDto.tags.length > 0) {
            queryBuilder.andWhere('listing.metadata->\'tags\' ?| array[:...tags]', { tags: queryDto.tags });
        }
        if (queryDto.userId) {
            queryBuilder.andWhere('listing.userId = :userId', { userId: queryDto.userId });
        }
        if (queryDto.excludeId) {
            queryBuilder.andWhere('listing.id != :excludeId', { excludeId: queryDto.excludeId });
        }
        console.log('excludeFeaturedSubscriptions', queryDto.excludeFeaturedSubscriptions);
        if (queryDto.excludeFeaturedSubscriptions) {
            console.log('Excluding listings with $128 featured subscriptions');
            queryBuilder.andWhere(`NOT EXISTS (
        SELECT 1 FROM subscriptions subscription
        WHERE subscription.listing_id = listing.id
        AND subscription.amount = :excludeAmount
        AND subscription.includes_featured = true
        AND subscription.status = :subscriptionStatus
        AND subscription.current_period_end > NOW()
      )`, {
                excludeAmount: 128,
                subscriptionStatus: subscription_entity_1.SubscriptionStatusEnum.ACTIVE,
            });
        }
        return queryBuilder;
    }
    buildAdminQueryBuilder(queryDto) {
        const queryBuilder = this.listingRepository.createQueryBuilder('listing')
            .leftJoinAndSelect('listing.user', 'user')
            .leftJoinAndSelect('listing.breedRelation', 'breed');
        if (queryDto.status) {
            queryBuilder.andWhere('listing.status = :status', { status: queryDto.status });
        }
        if (!queryDto.includeExpired) {
            queryBuilder.andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > NOW())');
        }
        if (queryDto.search) {
            queryBuilder.andWhere('(listing.title ILIKE :search OR listing.description ILIKE :search OR listing.breed ILIKE :search OR listing.location ILIKE :search)', { search: `%${queryDto.search}%` });
        }
        if (queryDto.type) {
            queryBuilder.andWhere('listing.type = :type', { type: queryDto.type });
        }
        if (queryDto.types && queryDto.types.length > 0) {
            queryBuilder.andWhere('listing.type IN (:...types)', { types: queryDto.types });
        }
        if (queryDto.category) {
            queryBuilder.andWhere('listing.category = :category', { category: queryDto.category });
        }
        if (queryDto.breed) {
            queryBuilder.andWhere('(listing.breed ILIKE :breed OR breed.name ILIKE :breed)', { breed: `%${queryDto.breed}%` });
        }
        if (queryDto.location) {
            queryBuilder.andWhere('listing.location ILIKE :location', { location: `%${queryDto.location}%` });
        }
        if (queryDto.gender) {
            queryBuilder.andWhere('listing.fields->>\'gender\' = :gender', { gender: queryDto.gender });
        }
        if (queryDto.userId) {
            queryBuilder.andWhere('listing.userId = :userId', { userId: queryDto.userId });
        }
        if (queryDto.excludeId) {
            queryBuilder.andWhere('listing.id != :excludeId', { excludeId: queryDto.excludeId });
        }
        queryBuilder.andWhere('listing.status != :deleted', { deleted: listing_entity_1.ListingStatusEnum.DELETED });
        return queryBuilder;
    }
};
exports.ListingsRepository = ListingsRepository;
exports.ListingsRepository = ListingsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(listing_entity_1.Listing)),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ListingsRepository);
//# sourceMappingURL=listings.repository.js.map