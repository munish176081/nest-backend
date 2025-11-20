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
exports.ActivityLogsController = void 0;
const common_1 = require("@nestjs/common");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const ActiveUserGuard_1 = require("../../middleware/ActiveUserGuard");
const AdminGuard_1 = require("../../middleware/AdminGuard");
const activity_logs_service_1 = require("./activity-logs.service");
let ActivityLogsController = class ActivityLogsController {
    constructor(activityLogsService) {
        this.activityLogsService = activityLogsService;
    }
    async getActivityLogs(query) {
        return this.activityLogsService.getActivityLogs(query);
    }
    async getRecentActivities(limit = '50') {
        const limitNum = parseInt(limit);
        return this.activityLogsService.getRecentActivities(limitNum);
    }
    async getActivityStats() {
        return this.activityLogsService.getActivityStats();
    }
    async getUserActivities(userId, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        return this.activityLogsService.getUserActivities(userId, pageNum, limitNum);
    }
    async getActivitiesByType(type, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        return this.activityLogsService.getActivitiesByType(type, pageNum, limitNum);
    }
    async cleanOldLogs(days = '90') {
        const daysToKeep = parseInt(days);
        return this.activityLogsService.cleanOldLogs(daysToKeep);
    }
};
exports.ActivityLogsController = ActivityLogsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ActivityLogsController.prototype, "getActivityLogs", null);
__decorate([
    (0, common_1.Get)('recent'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ActivityLogsController.prototype, "getRecentActivities", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ActivityLogsController.prototype, "getActivityStats", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ActivityLogsController.prototype, "getUserActivities", null);
__decorate([
    (0, common_1.Get)('type/:type'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ActivityLogsController.prototype, "getActivitiesByType", null);
__decorate([
    (0, common_1.Get)('clean/old-logs'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ActivityLogsController.prototype, "cleanOldLogs", null);
exports.ActivityLogsController = ActivityLogsController = __decorate([
    (0, common_1.Controller)('admin/activity-logs'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard, AdminGuard_1.AdminGuard),
    __metadata("design:paramtypes", [activity_logs_service_1.ActivityLogsService])
], ActivityLogsController);
//# sourceMappingURL=activity-logs.controller.js.map