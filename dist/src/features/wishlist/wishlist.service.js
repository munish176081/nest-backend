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
exports.WishlistService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wishlist_entity_1 = require("./entities/wishlist.entity");
const listings_service_1 = require("../listings/listings.service");
let WishlistService = class WishlistService {
    constructor(wishlistRepository, listingsService) {
        this.wishlistRepository = wishlistRepository;
        this.listingsService = listingsService;
    }
    async addToWishlist(userId, addToWishlistDto) {
        const { listingId } = addToWishlistDto;
        const listing = await this.listingsService.getListingById(listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId === userId) {
            throw new common_1.BadRequestException('Cannot add your own listing to wishlist');
        }
        const existingWishlist = await this.wishlistRepository.findOne({
            where: { userId, listingId }
        });
        if (existingWishlist) {
            throw new common_1.BadRequestException('Listing already in wishlist');
        }
        const wishlist = this.wishlistRepository.create({
            userId,
            listingId,
        });
        const savedWishlist = await this.wishlistRepository.save(wishlist);
        return {
            id: savedWishlist.id,
            userId: savedWishlist.userId,
            listingId: savedWishlist.listingId,
            createdAt: savedWishlist.createdAt,
            listing: {
                id: listing.id,
                title: listing.title,
                price: listing.price,
                breed: listing.breed,
                location: listing.location,
                imageUrl: listing.fields?.imageUrl || listing.fields?.images?.[0],
            },
        };
    }
    async removeFromWishlist(userId, listingId) {
        const wishlist = await this.wishlistRepository.findOne({
            where: { userId, listingId }
        });
        if (!wishlist) {
            throw new common_1.NotFoundException('Listing not found in wishlist');
        }
        await this.wishlistRepository.remove(wishlist);
    }
    async getUserWishlist(userId, page = 1, limit = 20) {
        const [wishlistItems, total] = await this.wishlistRepository.findAndCount({
            where: { userId },
            relations: ['listing'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        const validItems = wishlistItems.filter(item => item.listing !== null);
        const items = validItems.map(item => ({
            id: item.id,
            userId: item.userId,
            listingId: item.listingId,
            createdAt: item.createdAt,
            listing: {
                id: item.listing.id,
                title: item.listing.title,
                price: item.listing.price,
                breed: item.listing.breed,
                location: item.listing.location,
                imageUrl: item.listing.fields?.imageUrl || item.listing.fields?.images?.[0],
            },
        }));
        return {
            items,
            total,
            page,
            limit,
            hasMore: (page * limit) < total,
        };
    }
    async getWishlistStatus(userId, listingIds) {
        if (listingIds.length === 0) {
            return [];
        }
        const wishlistItems = await this.wishlistRepository.find({
            where: {
                userId,
                listingId: (0, typeorm_2.In)(listingIds),
            },
            select: ['listingId'],
        });
        const wishlistedIds = new Set(wishlistItems.map(item => item.listingId));
        return listingIds.map(listingId => ({
            listingId,
            isWishlisted: wishlistedIds.has(listingId),
        }));
    }
    async isInWishlist(userId, listingId) {
        const wishlist = await this.wishlistRepository.findOne({
            where: { userId, listingId }
        });
        return !!wishlist;
    }
};
exports.WishlistService = WishlistService;
exports.WishlistService = WishlistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wishlist_entity_1.Wishlist)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        listings_service_1.ListingsService])
], WishlistService);
//# sourceMappingURL=wishlist.service.js.map