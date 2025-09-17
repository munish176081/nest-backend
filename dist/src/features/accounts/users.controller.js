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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const user_dto_1 = require("./dto/user.dto");
const users_service_1 = require("./users.service");
const listings_service_1 = require("../listings/listings.service");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const serialize_interceptor_1 = require("../../transformers/serialize.interceptor");
const create_listing_dto_1 = require("../listings/dto/create-listing.dto");
const response_listing_dto_1 = require("../listings/dto/response-listing.dto");
const update_listing_dto_1 = require("../listings/dto/update-listing.dto");
let UsersController = class UsersController {
    constructor(listingsService, usersService) {
        this.listingsService = listingsService;
        this.usersService = usersService;
    }
    async findCurrenUser(req) {
        return req.user;
    }
    async getUserListings(req) {
        const listings = await this.listingsService.getUserListings(req.user.id, {
            includeDrafts: true,
            includeExpired: true
        });
        return listings;
    }
    async createListing(req, createListingDto) {
        return await this.listingsService.createListing(createListingDto, req.user.id);
    }
    async publishListing(req, id) {
        return await this.listingsService.publishListing(req.user.id, id);
    }
    async updateListing(req, id, updateListingDto) {
        return await this.listingsService.updateListing(req.user.id, id, updateListingDto);
    }
    async updateListingAvailability(req, id, body) {
        return await this.listingsService.updateAvailability(req.user.id, id, body.availability);
    }
    async deleteListing(req, id) {
        return await this.listingsService.deleteListing(req.user.id, id);
    }
    async getUserListing(req, id) {
        const listing = await this.listingsService.getListingById(id, false, req.user.id);
        return listing;
    }
    async refreshSession(req) {
        const user = await this.usersService.validateAndGetUser(req.user.email);
        return { message: 'Session refreshed', user: req.user };
    }
    async migrateUsers() {
        await this.usersService.migrateExistingUsers();
        return { message: 'User migration completed' };
    }
    async getCurrentUserDebug(req) {
        return {
            message: 'Current user debug info (no admin check)',
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            session: req.session,
            headers: {
                authorization: req.headers.authorization,
                cookie: req.headers.cookie,
            }
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findCurrenUser", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingSummaryDto),
    (0, common_1.Get)('/listings'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserListings", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    (0, common_1.Post)('/listings'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_listing_dto_1.CreateListingDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    (0, common_1.Post)('/listings/:id/publish'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "publishListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    (0, common_1.Put)('/listings/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_listing_dto_1.UpdateListingDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    (0, common_1.Put)('/listings/:id/availability'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateListingAvailability", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Delete)('/listings/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, serialize_interceptor_1.Serialize)(response_listing_dto_1.ListingResponseDto),
    (0, common_1.Get)('/listings/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserListing", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)('/refresh-session'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "refreshSession", null);
__decorate([
    (0, common_1.Post)('/migrate-users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "migrateUsers", null);
__decorate([
    (0, common_1.Get)('/debug/me'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCurrentUserDebug", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [listings_service_1.ListingsService,
        users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map