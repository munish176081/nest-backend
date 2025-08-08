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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingsService = void 0;
const common_1 = require("@nestjs/common");
const listings_repository_1 = require("./listings.repository");
const listing_entity_1 = require("./entities/listing.entity");
let ListingsService = class ListingsService {
    constructor(listingsRepository) {
        this.listingsRepository = listingsRepository;
    }
    async createListing(userId, createListingDto) {
        this.validateListingTypeAndCategory(createListingDto.type, createListingDto.category);
        const processedFields = createListingDto.fields ? await this.processListingFields(createListingDto.type, createListingDto.fields) : {};
        const metadata = {
            contactInfo: createListingDto.contactInfo,
            images: createListingDto.images || [],
            videos: createListingDto.videos || [],
            documents: createListingDto.documents || [],
            tags: createListingDto.tags || [],
            featured: createListingDto.isFeatured || false,
            premium: createListingDto.isPremium || false,
            ...createListingDto.metadata,
        };
        console.log('🔍 CreateListing Metadata Debug:', {
            originalMetadata: createListingDto.metadata,
            finalMetadata: metadata,
            motherImages: metadata.motherImages,
            fatherImages: metadata.fatherImages
        });
        const expiresAt = this.calculateExpirationDate(createListingDto.type, createListingDto.expiresAt);
        const listingData = {
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
            status: listing_entity_1.ListingStatusEnum.ACTIVE,
            isActive: true,
            seoData: createListingDto.seoData,
            motherInfo: createListingDto.motherInfo,
            fatherInfo: createListingDto.fatherInfo,
        };
        const listing = await this.listingsRepository.create(listingData);
        return this.transformToListingResponse(listing);
    }
    async updateListing(userId, listingId, updateListingDto) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId !== userId) {
            throw new common_1.ForbiddenException('You can only update your own listings');
        }
        let processedFields = listing.fields;
        if (updateListingDto.fields) {
            processedFields = await this.processListingFields(listing.type, updateListingDto.fields);
        }
        let metadata = {
            ...listing.metadata,
            ...updateListingDto.metadata,
        };
        console.log('🔍 UpdateListing Metadata Debug:', {
            existingMetadata: listing.metadata,
            newMetadata: updateListingDto.metadata,
            finalMetadata: metadata,
            motherImages: metadata.motherImages,
            fatherImages: metadata.fatherImages
        });
        if (updateListingDto.contactInfo) {
            metadata.contactInfo = updateListingDto.contactInfo;
        }
        if (updateListingDto.images) {
            metadata.images = updateListingDto.images;
        }
        if (updateListingDto.videos) {
            metadata.videos = updateListingDto.videos;
        }
        if (updateListingDto.documents) {
            metadata.documents = updateListingDto.documents;
        }
        if (updateListingDto.tags) {
            metadata.tags = updateListingDto.tags;
        }
        const updateData = {
            title: updateListingDto.title,
            description: updateListingDto.description,
            price: updateListingDto.price,
            breed: updateListingDto.breed,
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
    async updateAvailability(userId, listingId, availability) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId !== userId) {
            throw new common_1.ForbiddenException('You can only update your own listings');
        }
        const updateData = {
            availability,
        };
        const updatedListing = await this.listingsRepository.update(listingId, updateData);
        return this.transformToListingResponse(updatedListing);
    }
    async publishListing(userId, listingId) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId !== userId) {
            throw new common_1.ForbiddenException('You can only publish your own listings');
        }
        if (listing.status !== listing_entity_1.ListingStatusEnum.DRAFT) {
            throw new common_1.BadRequestException('Only draft listings can be published');
        }
        await this.validateRequiredFields(listing.type, listing.fields);
        const updateData = {
            status: listing_entity_1.ListingStatusEnum.ACTIVE,
            publishedAt: new Date(),
        };
        const updatedListing = await this.listingsRepository.update(listingId, updateData);
        return this.transformToListingResponse(updatedListing);
    }
    async deleteListing(userId, listingId) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own listings');
        }
        await this.listingsRepository.softDelete(listingId);
    }
    async getListingById(listingId, incrementView = false, userId) {
        const listing = await this.listingsRepository.findById(listingId, true);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (userId && listing.userId !== userId) {
            throw new common_1.ForbiddenException('You can only view your own listings');
        }
        if (incrementView && listing.status === listing_entity_1.ListingStatusEnum.ACTIVE) {
            await this.listingsRepository.incrementViewCount(listingId);
        }
        return this.transformToListingResponse(listing);
    }
    async getUserListings(userId, options) {
        const listings = await this.listingsRepository.findByUserId(userId, options);
        return listings.map(listing => this.transformToListingSummary(listing));
    }
    async searchListings(searchDto) {
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
    async getListings(queryDto) {
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
    async getFeaturedListings(limit = 10) {
        const listings = await this.listingsRepository.findFeaturedListings(limit);
        return listings.map(listing => this.transformToListingSummary(listing));
    }
    async getPremiumListings(limit = 10) {
        const listings = await this.listingsRepository.findPremiumListings(limit);
        return listings.map(listing => this.transformToListingSummary(listing));
    }
    async incrementFavoriteCount(listingId) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        await this.listingsRepository.incrementFavoriteCount(listingId);
    }
    async decrementFavoriteCount(listingId) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        await this.listingsRepository.decrementFavoriteCount(listingId);
    }
    async incrementContactCount(listingId) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        await this.listingsRepository.incrementContactCount(listingId);
    }
    async getListingStats(userId) {
        return await this.listingsRepository.getListingStats(userId);
    }
    validateListingTypeAndCategory(type, category) {
        const typeCategoryMap = {
            'SEMEN_LISTING': 'breeding',
            'PUPPY_LISTING': 'puppy',
            'STUD_LISTING': 'breeding',
            'FUTURE_LISTING': 'puppy',
            'WANTED_LISTING': 'wanted',
            'OTHER_SERVICES': 'service',
        };
        if (typeCategoryMap[type] !== category) {
            throw new common_1.BadRequestException(`Invalid category for listing type: ${type}`);
        }
    }
    async processListingFields(type, fields) {
        return fields;
    }
    calculateExpirationDate(type, customExpiresAt) {
        if (customExpiresAt) {
            return new Date(customExpiresAt);
        }
        const expirationDays = {
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
    async validateRequiredFields(type, fields) {
        if (!fields || Object.keys(fields).length === 0) {
            throw new common_1.BadRequestException('Listing fields are required');
        }
    }
    transformToListingResponse(listing) {
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
            motherInfo: listing.motherInfo,
            fatherInfo: listing.fatherInfo,
            user: listing.user,
        };
    }
    transformToListingSummary(listing) {
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
};
exports.ListingsService = ListingsService;
exports.ListingsService = ListingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [listings_repository_1.ListingsRepository])
], ListingsService);
//# sourceMappingURL=listings.service.js.map