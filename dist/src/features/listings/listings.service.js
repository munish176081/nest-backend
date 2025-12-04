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
exports.ListingsService = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const listings_repository_1 = require("./listings.repository");
const listing_entity_1 = require("./entities/listing.entity");
const breeds_service_1 = require("../breeds/breeds.service");
const date_1 = require("../../helpers/date");
const users_service_1 = require("../accounts/users.service");
const activity_logs_service_1 = require("../accounts/activity-logs.service");
const payment_entity_1 = require("../payments/entities/payment.entity");
const subscription_entity_1 = require("../subscriptions/entities/subscription.entity");
const email_service_1 = require("../email/email.service");
const config_1 = require("@nestjs/config");
const templates_1 = require("../email/templates");
let ListingsService = class ListingsService {
    constructor(listingsRepository, breedsService, usersService, activityLogsService, subscriptionsService, paymentRepository, subscriptionRepository, listingRepository, emailService, configService) {
        this.listingsRepository = listingsRepository;
        this.breedsService = breedsService;
        this.usersService = usersService;
        this.activityLogsService = activityLogsService;
        this.subscriptionsService = subscriptionsService;
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.listingRepository = listingRepository;
        this.emailService = emailService;
        this.configService = configService;
    }
    async createListing(createListingDto, userId, ipAddress, userAgent) {
        this.validateListingTypeAndCategory(createListingDto.type, createListingDto.category);
        const processedFields = createListingDto.fields ? await this.processListingFields(createListingDto.type, createListingDto.fields) : {};
        console.log('🔍 Creating listing with fields:', {
            originalFields: createListingDto.fields,
            processedFields: processedFields,
            badges: processedFields.badges,
            dnaResults: processedFields.dnaResults,
            hasBadges: Array.isArray(processedFields.badges),
            hasDnaResults: Array.isArray(processedFields.dnaResults)
        });
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
        const expiresAt = this.calculateExpirationDate(createListingDto.type, createListingDto.expiresAt);
        let breedName = createListingDto.breed;
        if (createListingDto.breedId) {
            const breed = await this.breedsService.findById(createListingDto.breedId);
            if (breed) {
                breedName = breed.name;
            }
        }
        const listingData = {
            userId,
            type: createListingDto.type,
            category: createListingDto.category,
            title: createListingDto.title,
            description: createListingDto.description,
            fields: processedFields,
            metadata,
            price: createListingDto.price,
            breed: breedName,
            breedId: createListingDto.breedId,
            location: createListingDto.location,
            expiresAt,
            startedOrRenewedAt: new Date(),
            status: createListingDto.status || listing_entity_1.ListingStatusEnum.PENDING_REVIEW,
            isActive: (createListingDto.status === listing_entity_1.ListingStatusEnum.DRAFT || createListingDto.status === listing_entity_1.ListingStatusEnum.PENDING_REVIEW || !createListingDto.status) ? false : true,
            seoData: createListingDto.seoData,
            motherInfo: createListingDto.motherInfo,
            fatherInfo: createListingDto.fatherInfo,
            studInfo: createListingDto.studInfo,
            paymentId: createListingDto.paymentId || null,
            subscriptionId: createListingDto.subscriptionId || null,
        };
        const listing = await this.listingsRepository.create(listingData);
        if (listing.paymentId) {
            try {
                console.log('🔗 Linking payment to listing:', { paymentId: listing.paymentId, listingId: listing.id });
                await this.paymentRepository
                    .createQueryBuilder()
                    .update(payment_entity_1.Payment)
                    .set({ listingId: listing.id })
                    .where('id = :paymentId', { paymentId: listing.paymentId })
                    .execute();
                console.log('✅ Payment linked to listing successfully');
            }
            catch (error) {
                console.error('❌ Error linking payment to listing:', error);
            }
        }
        if (listing.subscriptionId) {
            try {
                console.log('🔗 Linking subscription to listing:', { subscriptionId: listing.subscriptionId, listingId: listing.id });
                let subscription = await this.subscriptionRepository.findOne({
                    where: { id: listing.subscriptionId },
                });
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
                    if (subscription.currentPeriodEnd) {
                        listing.expiresAt = subscription.currentPeriodEnd;
                        await this.listingsRepository.update(listing.id, { expiresAt: subscription.currentPeriodEnd });
                        console.log('📅 Updated listing expiration to:', subscription.currentPeriodEnd);
                    }
                    await this.subscriptionRepository.save(subscription);
                    console.log('✅ Subscription linked to listing successfully');
                    if (listing.subscriptionId !== subscription.id) {
                        await this.listingsRepository.update(listing.id, {
                            subscriptionId: subscription.id
                        });
                        console.log('✅ Updated listing.subscriptionId to database subscription ID:', subscription.id);
                    }
                    try {
                        const updatedPayments = await this.paymentRepository
                            .createQueryBuilder()
                            .update(payment_entity_1.Payment)
                            .set({ listingId: listing.id })
                            .where('listingId IS NULL')
                            .andWhere(`(metadata->>'subscriptionId' = :subscriptionId OR metadata->>'paypalSubscriptionId' = :providerSubscriptionId)`, { subscriptionId: subscription.id, providerSubscriptionId: subscription.subscriptionId })
                            .execute();
                        if (updatedPayments.affected && updatedPayments.affected > 0) {
                            console.log(`✅ Updated ${updatedPayments.affected} payment record(s) with listing ID:`, listing.id);
                        }
                    }
                    catch (paymentUpdateError) {
                        console.error('❌ Error updating payment records with listing ID:', paymentUpdateError);
                    }
                }
                else {
                    console.warn('⚠️ Subscription not found with subscriptionId (tried both database ID and provider subscription ID):', listing.subscriptionId);
                }
            }
            catch (error) {
                console.error('❌ Error linking subscription to listing:', error);
            }
        }
        try {
            const user = await this.usersService.getUserById(userId);
            if (user) {
                await this.activityLogsService.logListingCreation(listing, user, ipAddress, userAgent);
            }
        }
        catch (error) {
            console.error('Failed to log listing creation activity:', error);
        }
        return this.transformToListingResponse(listing);
    }
    async updateListing(userId, listingId, updateListingDto) {
        console.log('🔔 [Listings Service] updateListing - START');
        console.log('🔔 [Listings Service] updateListing - Input:', {
            listingId,
            userId,
            updateListingDto: JSON.stringify(updateListingDto, null, 2),
        });
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId !== userId) {
            throw new common_1.ForbiddenException('You can only update your own listings');
        }
        console.log('📋 [Listings Service] updateListing - Listing BEFORE UPDATE:', {
            listingId: listing.id,
            currentStatus: listing.status,
            isActive: listing.isActive,
            subscriptionId: listing.subscriptionId,
        });
        let processedFields = listing.fields;
        if (updateListingDto.fields) {
            processedFields = await this.processListingFields(listing.type, updateListingDto.fields);
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
        let metadata = {
            ...listing.metadata,
            ...updateListingDto.metadata,
        };
        let breedName = updateListingDto.breed;
        if (updateListingDto.breedId && updateListingDto.breedId !== listing.breedId) {
            const breed = await this.breedsService.findById(updateListingDto.breedId);
            if (breed) {
                breedName = breed.name;
            }
        }
        if (updateListingDto.title !== undefined)
            listing.title = updateListingDto.title;
        if (updateListingDto.description !== undefined)
            listing.description = updateListingDto.description;
        if (updateListingDto.price !== undefined)
            listing.price = updateListingDto.price;
        if (updateListingDto.breed !== undefined)
            listing.breed = updateListingDto.breed;
        if (updateListingDto.breedId !== undefined)
            listing.breedId = updateListingDto.breedId;
        if (updateListingDto.location !== undefined)
            listing.location = updateListingDto.location;
        const updateData = {
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
        if (updateListingDto.subscriptionId) {
            try {
                console.log('🔗 Linking subscription to listing (update):', { subscriptionId: updateListingDto.subscriptionId, listingId });
                let subscription = await this.subscriptionRepository.findOne({
                    where: { id: updateListingDto.subscriptionId },
                });
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
                    const currentListing = await this.listingsRepository.findById(listingId);
                    const currentStatus = currentListing?.status;
                    console.log('📊 [Listings Service] updateListing - Current listing status before subscription link:', currentStatus);
                    const expirationUpdate = {};
                    if (subscription.currentPeriodEnd) {
                        expirationUpdate.expiresAt = subscription.currentPeriodEnd;
                        console.log('📅 Updated listing expiration to:', subscription.currentPeriodEnd);
                    }
                    if (Object.keys(expirationUpdate).length > 0) {
                        await this.listingsRepository.update(listingId, expirationUpdate);
                    }
                    await this.subscriptionRepository.save(subscription);
                    console.log('✅ Subscription linked to listing successfully (update)');
                    if (subscription.id !== updateListingDto.subscriptionId) {
                        await this.listingsRepository.update(listingId, {
                            subscriptionId: subscription.id
                        });
                        console.log('✅ Updated listing.subscriptionId to database subscription ID:', subscription.id);
                    }
                    const finalListing = await this.listingsRepository.findById(listingId);
                    console.log('📊 [Listings Service] updateListing - Final listing status after subscription link:', finalListing?.status);
                }
                else {
                    console.warn('⚠️ Subscription not found with subscriptionId (tried both database ID and Stripe ID):', updateListingDto.subscriptionId);
                }
            }
            catch (error) {
                console.error('❌ Error linking subscription to listing (update):', error);
            }
        }
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
        console.log(userId, listing.userId, "userId DEBUG");
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
        console.log('📋 getListings called with queryDto:', queryDto);
        const result = await this.listingsRepository.findActiveListings(queryDto);
        console.log('📋 Found listings count:', result.listings.length);
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
    async getAdminListings(queryDto) {
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
            'PUPPY_LITTER_LISTING': 'puppy',
            'LITTER_LISTING': 'puppy',
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
        const processedFields = { ...fields };
        if (type !== listing_entity_1.ListingTypeEnum.STUD_LISTING && processedFields.dateOfBirth) {
            processedFields.age = (0, date_1.calculateAge)(processedFields.dateOfBirth);
        }
        else if (type === listing_entity_1.ListingTypeEnum.STUD_LISTING && processedFields.age !== undefined) {
            const ageValue = typeof processedFields.age === 'number'
                ? processedFields.age
                : parseInt(processedFields.age);
            processedFields.age = isNaN(ageValue) ? 'Unknown Age' : `${ageValue} year${ageValue !== 1 ? 's' : ''}`;
        }
        return processedFields;
    }
    calculateExpirationDate(type, customExpiresAt) {
        if (customExpiresAt) {
            return new Date(customExpiresAt);
        }
        const expirationDays = {
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
    async validateRequiredFields(type, fields) {
        if (!fields || Object.keys(fields).length === 0) {
            throw new common_1.BadRequestException('Listing fields are required');
        }
    }
    async transformToListingResponse(listing) {
        let calculatedAge = '';
        if (listing.type === listing_entity_1.ListingTypeEnum.STUD_LISTING) {
            if (listing.fields?.age !== undefined) {
                const ageValue = typeof listing.fields.age === 'number'
                    ? listing.fields.age
                    : parseInt(listing.fields.age);
                calculatedAge = isNaN(ageValue) ? 'Unknown Age' : `${ageValue} year${ageValue !== 1 ? 's' : ''}`;
            }
        }
        else if (listing.fields?.dateOfBirth) {
            calculatedAge = (0, date_1.calculateAge)(listing.fields.dateOfBirth);
        }
        let featuredImage = null;
        if (listing.type === 'PUPPY_LITTER_LISTING' && listing.fields?.individualPuppies?.length > 0) {
            const allPuppyImages = [];
            listing.fields.individualPuppies.forEach((puppy) => {
                if (puppy.puppyImages && Array.isArray(puppy.puppyImages)) {
                    allPuppyImages.push(...puppy.puppyImages);
                }
            });
            featuredImage = allPuppyImages[0] || listing.metadata?.images?.[0] || null;
        }
        else {
            featuredImage = listing.metadata?.images?.[0] || null;
        }
        const user = await this.usersService.getUserById(listing.userId);
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
        let displayType = listing.type;
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
    transformToListingSummary(listing) {
        let calculatedAge = '';
        if (listing.type === listing_entity_1.ListingTypeEnum.STUD_LISTING) {
            if (listing.fields?.age !== undefined) {
                const ageValue = typeof listing.fields.age === 'number'
                    ? listing.fields.age
                    : parseInt(listing.fields.age);
                calculatedAge = isNaN(ageValue) ? 'Unknown Age' : `${ageValue} year${ageValue !== 1 ? 's' : ''}`;
            }
        }
        else if (listing.fields?.dateOfBirth) {
            calculatedAge = (0, date_1.calculateAge)(listing.fields.dateOfBirth);
        }
        let featuredImage = null;
        if (listing.type === 'PUPPY_LITTER_LISTING' && listing.fields?.individualPuppies?.length > 0) {
            const allPuppyImages = [];
            listing.fields.individualPuppies.forEach((puppy) => {
                if (puppy.puppyImages && Array.isArray(puppy.puppyImages)) {
                    allPuppyImages.push(...puppy.puppyImages);
                }
            });
            featuredImage = allPuppyImages[0] || listing.metadata?.images?.[0] || null;
        }
        else {
            featuredImage = listing.metadata?.images?.[0] || null;
        }
        const transformedUser = listing.user ? {
            id: listing.user.id,
            name: listing.user.name,
            email: listing.user.email,
            username: listing.user.username,
            imageUrl: listing.user.imageUrl,
        } : null;
        let displayType = listing.type;
        if (listing.type === listing_entity_1.ListingTypeEnum.PUPPY_LITTER_LISTING && listing.fields?.listLitterOption === 'single-puppy') {
            displayType = listing_entity_1.ListingTypeEnum.PUPPY_LISTING;
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
            age: calculatedAge || listing.fields?.age || '',
            paymentId: listing.paymentId || null,
            subscriptionId: listing.subscriptionId || null,
            expiresAt: listing.expiresAt,
            isActive: listing.isActive,
            subscriptionRenewalDate: listing.subscriptionRenewalDate || null,
        };
        return result;
    }
    async syncListingSubscriptionStatus(userId, listingId) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId !== userId) {
            throw new common_1.ForbiddenException('You can only sync your own listings');
        }
        if (listing.subscriptionId) {
            const subscription = await this.subscriptionRepository.findOne({
                where: { id: listing.subscriptionId },
            });
            if (subscription && subscription.paymentMethod === 'stripe') {
                await this.subscriptionsService.syncSubscriptionsFromStripe(userId);
                const updatedSubscription = await this.subscriptionRepository.findOne({
                    where: { id: listing.subscriptionId },
                });
                if (updatedSubscription) {
                    const inactiveStatuses = [
                        subscription_entity_1.SubscriptionStatusEnum.CANCELLED,
                        subscription_entity_1.SubscriptionStatusEnum.PAST_DUE,
                        subscription_entity_1.SubscriptionStatusEnum.UNPAID,
                        subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
                    ];
                    if (inactiveStatuses.includes(updatedSubscription.status)) {
                        const updateData = {
                            isActive: false,
                            status: listing_entity_1.ListingStatusEnum.EXPIRED,
                        };
                        await this.listingsRepository.update(listingId, updateData);
                    }
                    else if (updatedSubscription.status === subscription_entity_1.SubscriptionStatusEnum.ACTIVE) {
                        const updateData = {
                            expiresAt: updatedSubscription.currentPeriodEnd,
                        };
                        if (listing.status === listing_entity_1.ListingStatusEnum.DRAFT) {
                            updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                            updateData.isActive = false;
                            console.log('⏳ [Sync] Changing listing from DRAFT to PENDING_REVIEW for admin approval');
                        }
                        else if (listing.status === listing_entity_1.ListingStatusEnum.EXPIRED) {
                            updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                            updateData.isActive = false;
                            console.log('🔄 [Sync] Reactivating expired listing to PENDING_REVIEW for admin approval');
                        }
                        else {
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
    async reactivateListing(userId, listingId, subscriptionId) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId !== userId) {
            throw new common_1.ForbiddenException('You can only reactivate your own listings');
        }
        if (listing.isActive && listing.status === listing_entity_1.ListingStatusEnum.ACTIVE) {
        }
        if (subscriptionId) {
            const subscription = await this.subscriptionRepository.findOne({
                where: { id: subscriptionId },
            });
            if (!subscription) {
                throw new common_1.NotFoundException('Subscription not found');
            }
            if (subscription.userId !== userId) {
                throw new common_1.ForbiddenException('Subscription does not belong to you');
            }
            subscription.listingId = listingId;
            await this.subscriptionRepository.save(subscription);
            const updateData = {
                subscriptionId: subscription.id,
                isActive: true,
                status: listing_entity_1.ListingStatusEnum.ACTIVE,
                startedOrRenewedAt: new Date(),
            };
            if (subscription.currentPeriodEnd) {
                updateData.expiresAt = subscription.currentPeriodEnd;
            }
            const updatedListing = await this.listingsRepository.update(listingId, updateData);
            return this.transformToListingResponse(updatedListing);
        }
        throw new common_1.BadRequestException('Subscription ID is required for reactivation');
    }
    async checkAndUpdateExpiredListings() {
        const now = new Date();
        const expiredListings = await this.listingRepository
            .createQueryBuilder('listing')
            .where('listing.expiresAt < :now', { now })
            .andWhere('listing.isActive = :isActive', { isActive: true })
            .getMany();
        for (const listing of expiredListings) {
            if (listing.subscriptionId) {
                const subscription = await this.subscriptionRepository.findOne({
                    where: { id: listing.subscriptionId },
                });
                if (subscription) {
                    if (subscription.status === 'active' && subscription.currentPeriodEnd) {
                        listing.expiresAt = subscription.currentPeriodEnd;
                        await this.listingsRepository.update(listing.id, { expiresAt: subscription.currentPeriodEnd });
                        continue;
                    }
                }
            }
            await this.listingsRepository.update(listing.id, {
                status: listing_entity_1.ListingStatusEnum.EXPIRED,
            });
        }
    }
    async approveListing(listingId) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.status !== listing_entity_1.ListingStatusEnum.PENDING_REVIEW) {
            throw new common_1.BadRequestException(`Listing is not in PENDING_REVIEW status. Current status: ${listing.status}`);
        }
        const updateData = {
            status: listing_entity_1.ListingStatusEnum.ACTIVE,
            isActive: true,
        };
        const updatedListing = await this.listingsRepository.update(listingId, updateData);
        this.sendListingApprovedEmail(listing).catch((error) => {
            console.error('Failed to send listing approved email to user:', error);
        });
        this.sendListingApprovedAdminEmail(listing).catch((error) => {
            console.error('Failed to send listing approved email to admin:', error);
        });
        return this.transformToListingResponse(updatedListing);
    }
    async rejectListing(listingId, reason) {
        const listing = await this.listingsRepository.findById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.status !== listing_entity_1.ListingStatusEnum.PENDING_REVIEW) {
            throw new common_1.BadRequestException(`Listing is not in PENDING_REVIEW status. Current status: ${listing.status}`);
        }
        const updateData = {
            status: listing_entity_1.ListingStatusEnum.SUSPENDED,
            isActive: false,
            suspensionReason: reason || 'Listing rejected by admin',
            suspendedAt: new Date(),
        };
        const updatedListing = await this.listingsRepository.update(listingId, updateData);
        return this.transformToListingResponse(updatedListing);
    }
    async sendListingPendingReviewEmail(listing) {
        try {
            const user = listing.user || await this.usersService.getUserById(listing.userId);
            if (!user || !user.email) {
                console.warn(`Cannot send pending review email: User not found or has no email for listing ${listing.id}`);
                return;
            }
            const adminEmail = this.configService.get('contact.supportEmail') || process.env.ADMIN_SUPPORT_EMAIL;
            if (!adminEmail) {
                console.warn('Cannot send pending review email: Admin email not configured');
                return;
            }
            const breedName = listing.breedRelation?.name || listing.fields?.breed || listing.metadata?.breed || 'N/A';
            const location = listing.fields?.location || listing.metadata?.location || 'N/A';
            const listingTypeDisplay = this.getListingTypeDisplayName(listing.type);
            const siteUrl = this.configService.get('siteUrl') || process.env.SITE_URL || 'http://localhost:3000';
            const reviewUrl = `${siteUrl}/admin/listings`;
            await this.emailService.sendEmailWithTemplate({
                recipient: adminEmail,
                templateAlias: templates_1.postmarkEmailTemplates.listingPendingReview,
                dynamicTemplateData: {
                    logoUrl: templates_1.images.logo,
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
        }
        catch (error) {
            console.error('Error sending pending review email:', error);
        }
    }
    async sendListingApprovedEmail(listing) {
        try {
            const user = listing.user || await this.usersService.getUserById(listing.userId);
            if (!user || !user.email) {
                console.warn(`Cannot send approved email: User not found or has no email for listing ${listing.id}`);
                return;
            }
            const breedName = listing.breedRelation?.name || listing.fields?.breed || listing.metadata?.breed || 'N/A';
            const location = listing.fields?.location || listing.metadata?.location || 'N/A';
            const listingTypeDisplay = this.getListingTypeDisplayName(listing.type);
            const siteUrl = this.configService.get('siteUrl') || process.env.SITE_URL || 'http://localhost:3000';
            const listingUrl = `${siteUrl}/explore/${listing.id}`;
            await this.emailService.sendEmailWithTemplate({
                recipient: user.email,
                templateAlias: templates_1.postmarkEmailTemplates.listingApproved,
                dynamicTemplateData: {
                    logoUrl: templates_1.images.logo,
                    userName: user.name || 'User',
                    listingTitle: listing.title,
                    listingType: listingTypeDisplay,
                    breed: breedName,
                    location: location,
                    listingUrl: listingUrl,
                },
            });
        }
        catch (error) {
            console.error('Error sending approved email:', error);
        }
    }
    async sendListingApprovedAdminEmail(listing) {
        try {
            const user = listing.user || await this.usersService.getUserById(listing.userId);
            if (!user) {
                console.warn(`Cannot send approved admin email: User not found for listing ${listing.id}`);
                return;
            }
            const adminEmail = this.configService.get('contact.supportEmail') || process.env.ADMIN_SUPPORT_EMAIL;
            if (!adminEmail) {
                console.warn('Cannot send approved admin email: Admin email not configured');
                return;
            }
            const breedName = listing.breedRelation?.name || listing.fields?.breed || listing.metadata?.breed || 'N/A';
            const location = listing.fields?.location || listing.metadata?.location || 'N/A';
            const listingTypeDisplay = this.getListingTypeDisplayName(listing.type);
            const siteUrl = this.configService.get('siteUrl') || process.env.SITE_URL || 'http://localhost:3000';
            const listingUrl = `${siteUrl}/explore/${listing.id}`;
            await this.emailService.sendEmailWithTemplate({
                recipient: adminEmail,
                templateAlias: templates_1.postmarkEmailTemplates.listingApprovedAdmin,
                dynamicTemplateData: {
                    logoUrl: templates_1.images.logo,
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
        }
        catch (error) {
            console.error('Error sending approved admin email:', error);
        }
    }
    getListingTypeDisplayName(type) {
        const typeMap = {
            [listing_entity_1.ListingTypeEnum.PUPPY_LISTING]: 'Puppy Listing',
            [listing_entity_1.ListingTypeEnum.PUPPY_LITTER_LISTING]: 'Puppy Litter Listing',
            [listing_entity_1.ListingTypeEnum.LITTER_LISTING]: 'Litter Listing',
            [listing_entity_1.ListingTypeEnum.STUD_LISTING]: 'Stud Listing',
            [listing_entity_1.ListingTypeEnum.FUTURE_LISTING]: 'Future Listing',
            [listing_entity_1.ListingTypeEnum.WANTED_LISTING]: 'Wanted Listing',
            [listing_entity_1.ListingTypeEnum.SEMEN_LISTING]: 'Semen Listing',
            [listing_entity_1.ListingTypeEnum.OTHER_SERVICES]: 'Other Services',
        };
        return typeMap[type] || type;
    }
};
exports.ListingsService = ListingsService;
exports.ListingsService = ListingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => activity_logs_service_1.ActivityLogsService))),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => subscriptions_service_1.SubscriptionsService))),
    __param(5, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(6, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(7, (0, typeorm_1.InjectRepository)(listing_entity_1.Listing)),
    __metadata("design:paramtypes", [listings_repository_1.ListingsRepository,
        breeds_service_1.BreedsService,
        users_service_1.UsersService,
        activity_logs_service_1.ActivityLogsService,
        subscriptions_service_1.SubscriptionsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        email_service_1.EmailService,
        config_1.ConfigService])
], ListingsService);
//# sourceMappingURL=listings.service.js.map