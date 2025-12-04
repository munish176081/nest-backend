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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const ActiveUserGuard_1 = require("../../middleware/ActiveUserGuard");
const AdminGuard_1 = require("../../middleware/AdminGuard");
const serialize_interceptor_1 = require("../../transformers/serialize.interceptor");
const user_dto_1 = require("./dto/user.dto");
let AdminController = class AdminController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getUsers(query, res) {
        const { page = 1, limit = 20, search, role } = query;
        const data = await this.usersService.getUsersForAdmin({ page, limit, search, role });
        console.log('data', data);
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        return res.json(data);
    }
    async searchUsers(search, query) {
        const { page = 1, limit = 20 } = query;
        return this.usersService.searchUsersForAdmin({ page, limit, search });
    }
    async getUsersByRole(role, query) {
        const { page = 1, limit = 20 } = query;
        return this.usersService.getUsersByRoleForAdmin({ page, limit, role });
    }
    async getUser(id) {
        return this.usersService.getUserById(id);
    }
    async updateUserStatus(id, statusUpdate) {
        return this.usersService.updateUserStatus(id, statusUpdate.status);
    }
    async updateUserRole(id, roleUpdate) {
        return this.usersService.updateUserRole(id, roleUpdate);
    }
    async deleteUser(id) {
        return this.usersService.deleteUser(id);
    }
    async getDashboardStats() {
        return this.usersService.getDashboardStats();
    }
    async getCurrentUserDebug(req) {
        return {
            message: 'Current user debug info',
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            session: req.session,
            headers: {
                authorization: req.headers.authorization,
                cookie: req.headers.cookie,
            }
        };
    }
    async getUsersRaw(query) {
        const { page = 1, limit = 20, search, role } = query;
        try {
            const result = await this.usersService.getUsersForAdmin({ page, limit, search, role });
            return {
                message: 'Raw users data (no serialization)',
                query: { page, limit, search, role },
                result,
                usersCount: result.users.length,
                total: result.total
            };
        }
        catch (error) {
            return {
                message: 'Error fetching users',
                error: error.message,
                stack: error.stack
            };
        }
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('users'),
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)('users/search'),
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "searchUsers", null);
__decorate([
    (0, common_1.Get)('users/role/:role'),
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    __param(0, (0, common_1.Param)('role')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsersByRole", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/status'),
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.Patch)('users/:id/role'),
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserRole", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('debug/current-user'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getCurrentUserDebug", null);
__decorate([
    (0, common_1.Get)('debug/users-raw'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsersRaw", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard, AdminGuard_1.AdminGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map