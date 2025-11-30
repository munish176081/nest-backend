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
exports.ListingsController = void 0;
const common_1 = require("@nestjs/common");
const listings_service_1 = require("./listings.service");
const dto_1 = require("./dto");
const response_listing_dto_1 = require("./dto/response-listing.dto");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const AdminGuard_1 = require("../../middleware/AdminGuard");
const serialize_interceptor_1 = require("../../transformers/serialize.interceptor");
let ListingsController = class ListingsController {
    constructor(listingsService) {
        this.listingsService = listingsService;
    }
    async createListing(req, createListingDto) {
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        return await this.listingsService.createListing(createListingDto, req.user.id, ip, userAgent);
    }
    async updateListing(req, id, updateListingDto) {
        return await this.listingsService.updateListing(req.user.id, id, updateListingDto);
    }
    async publishListing(req, id) {
        return await this.listingsService.publishListing(req.user.id, id);
    }
    async deleteListing(req, id) {
        await this.listingsService.deleteListing(req.user.id, id);
    }
    async getUserListings(req, status, includeExpired, includeDrafts) {
        return await this.listingsService.getUserListings(req.user.id, {
            status: status,
            includeExpired: includeExpired === 'true',
            includeDrafts: includeDrafts === 'true',
        });
    }
    async searchListings(searchDto) {
        return await this.listingsService.searchListings(searchDto);
    }
    async getListings(queryDto) {
        return await this.listingsService.getListings(queryDto);
    }
    async getFeaturedListings(limit) {
        return await this.listingsService.getFeaturedListings(parseInt(limit) || 10);
    }
    async getPremiumListings(limit) {
        return await this.listingsService.getPremiumListings(parseInt(limit) || 10);
    }
    async getMyListingStats(req) {
        return await this.listingsService.getListingStats(req.user.id);
    }
    async getGlobalListingStats() {
        return await this.listingsService.getListingStats();
    }
    async getListingById(id, incrementView) {
        return await this.listingsService.getListingById(id, incrementView === 'true');
    }
    async getListingDebug(id) {
        const listing = await this.listingsService.getListingById(id, false);
        return {
            message: 'Debug data for listing',
            listingId: id,
            rawFields: listing.fields,
            badges: listing.fields?.badges,
            dnaResults: listing.fields?.dnaResults,
            hasBadges: Array.isArray(listing.fields?.badges),
            hasDnaResults: Array.isArray(listing.fields?.dnaResults),
            badgesCount: listing.fields?.badges?.length || 0,
            dnaResultsCount: listing.fields?.dnaResults?.length || 0,
            fieldsKeys: Object.keys(listing.fields || {}),
            fullResponse: listing
        };
    }
    async incrementFavoriteCount(id) {
        await this.listingsService.incrementFavoriteCount(id);
    }
    async decrementFavoriteCount(id) {
        await this.listingsService.decrementFavoriteCount(id);
    }
    async incrementContactCount(id) {
        await this.listingsService.incrementContactCount(id);
    }
    async reactivateListing(req, id, body) {
        return await this.listingsService.reactivateListing(req.user.id, id, body.subscriptionId || body.paymentId);
    }
    async syncListingSubscription(req, id) {
        return await this.listingsService.syncListingSubscriptionStatus(req.user.id, id);
    }
    async approveListing(id) {
        return await this.listingsService.approveListing(id);
    }
    async rejectListing(id, body) {
        return await this.listingsService.rejectListing(id, body.reason);
    }
    async getAdminListings(queryDto) {
        return await this.listingsService.getAdminListings(queryDto);
    }
};
exports.ListingsController = ListingsController;
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateListingDto]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "createListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Put)(':id'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateListingDto]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "updateListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(':id/publish'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "publishListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "deleteListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Get)('my/listings'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingSummaryDto),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('includeExpired')),
    __param(3, (0, common_1.Query)('includeDrafts')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getUserListings", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.PaginatedListingsResponseDto),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SearchListingDto]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "searchListings", null);
__decorate([
    (0, common_1.Get)(),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.PaginatedListingsResponseDto),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.QueryListingDto]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getListings", null);
__decorate([
    (0, common_1.Get)('featured'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingSummaryDto),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getFeaturedListings", null);
__decorate([
    (0, common_1.Get)('premium'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingSummaryDto),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getPremiumListings", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Get)('stats/my'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getMyListingStats", null);
__decorate([
    (0, common_1.Get)('stats/global'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getGlobalListingStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('incrementView')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getListingById", null);
__decorate([
    (0, common_1.Get)(':id/debug'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getListingDebug", null);
__decorate([
    (0, common_1.Post)(':id/favorite'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "incrementFavoriteCount", null);
__decorate([
    (0, common_1.Delete)(':id/favorite'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "decrementFavoriteCount", null);
__decorate([
    (0, common_1.Post)(':id/contact'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "incrementContactCount", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(':id/reactivate'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "reactivateListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(':id/sync-subscription'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "syncListingSubscription", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    (0, common_1.Post)(':id/approve'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "approveListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    (0, common_1.Post)(':id/reject'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "rejectListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    (0, common_1.Get)('admin/all'),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.PaginatedListingsResponseDto),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.QueryListingDto]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "getAdminListings", null);
exports.ListingsController = ListingsController = __decorate([
    (0, common_1.Controller)('listings'),
    __metadata("design:paramtypes", [listings_service_1.ListingsService])
], ListingsController);
//# sourceMappingURL=listings.controller.js.map