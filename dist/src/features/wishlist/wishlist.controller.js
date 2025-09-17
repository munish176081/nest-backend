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
exports.WishlistController = void 0;
const common_1 = require("@nestjs/common");
const wishlist_service_1 = require("./wishlist.service");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const dto_1 = require("./dto");
let WishlistController = class WishlistController {
    constructor(wishlistService) {
        this.wishlistService = wishlistService;
    }
    async addToWishlist(addToWishlistDto, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        return this.wishlistService.addToWishlist(userId, addToWishlistDto);
    }
    async removeFromWishlist(listingId, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        await this.wishlistService.removeFromWishlist(userId, listingId);
        return { message: 'Removed from wishlist successfully' };
    }
    async getUserWishlist(page = '1', limit = '20', req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        return this.wishlistService.getUserWishlist(userId, pageNum, limitNum);
    }
    async getWishlistStatus(listingIds, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        if (!listingIds) {
            return [];
        }
        const listingIdsArray = listingIds.split(',').filter(id => id.trim());
        return this.wishlistService.getWishlistStatus(userId, listingIdsArray);
    }
    async checkWishlistStatus(listingId, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        const isWishlisted = await this.wishlistService.isInWishlist(userId, listingId);
        return { isWishlisted };
    }
};
exports.WishlistController = WishlistController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AddToWishlistDto, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "addToWishlist", null);
__decorate([
    (0, common_1.Delete)(':listingId'),
    __param(0, (0, common_1.Param)('listingId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "removeFromWishlist", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "getUserWishlist", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Query)('listingIds')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "getWishlistStatus", null);
__decorate([
    (0, common_1.Get)('check/:listingId'),
    __param(0, (0, common_1.Param)('listingId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "checkWishlistStatus", null);
exports.WishlistController = WishlistController = __decorate([
    (0, common_1.Controller)('wishlist'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __metadata("design:paramtypes", [wishlist_service_1.WishlistService])
], WishlistController);
//# sourceMappingURL=wishlist.controller.js.map