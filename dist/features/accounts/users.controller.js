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
const listings_dto_1 = require("./dto/listings.dto");
const users_service_1 = require("./users.service");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const serialize_interceptor_1 = require("../../transformers/serialize.interceptor");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async findCurrenUser(req) {
        return req.user;
    }
    async getUserListings(req) {
    }
    async getUserListing(req, id) {
    }
    async refreshSession(req) {
        const user = await this.usersService.validateAndGetUser(req.user.email);
        return { message: 'Session refreshed', user: req.user };
    }
    async migrateUsers() {
        await this.usersService.migrateExistingUsers();
        return { message: 'User migration completed' };
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
    (0, serialize_interceptor_1.Serialize)(listings_dto_1.UserListings),
    (0, common_1.Get)('/listings'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserListings", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, serialize_interceptor_1.Serialize)(listings_dto_1.UserListings),
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
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map