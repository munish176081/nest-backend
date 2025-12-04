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
exports.MeetingsController = void 0;
const common_1 = require("@nestjs/common");
const meetings_service_1 = require("./meetings.service");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const update_meeting_dto_1 = require("./dto/update-meeting.dto");
let MeetingsController = class MeetingsController {
    constructor(meetingsService) {
        this.meetingsService = meetingsService;
    }
    async createMeeting(body, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        const { access_token, refresh_token, ...createMeetingDto } = body;
        return this.meetingsService.createMeeting(createMeetingDto, userId, access_token, refresh_token);
    }
    async getUserMeetings(req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        return this.meetingsService.getUserMeetings(userId);
    }
    async getAvailableSlots(listingId, date, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        if (!listingId || !date) {
            throw new common_1.BadRequestException('listingId and date are required');
        }
        return this.meetingsService.getAvailableSlots(listingId, date, userId);
    }
    async getListingMeetings(listingId, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        return this.meetingsService.getListingMeetings(listingId, userId);
    }
    async getMeeting(id, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        return this.meetingsService.getMeeting(id, userId);
    }
    async updateMeeting(id, updateMeetingDto, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        return this.meetingsService.updateMeeting(id, updateMeetingDto, userId);
    }
    async confirmMeeting(id, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        return this.meetingsService.confirmMeeting(id, userId);
    }
    async rejectMeeting(id, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        return this.meetingsService.rejectMeeting(id, userId);
    }
    async cancelMeeting(id, req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        return this.meetingsService.cancelMeeting(id, userId);
    }
};
exports.MeetingsController = MeetingsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "createMeeting", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "getUserMeetings", null);
__decorate([
    (0, common_1.Get)('available-slots'),
    __param(0, (0, common_1.Query)('listingId')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "getAvailableSlots", null);
__decorate([
    (0, common_1.Get)('listing/:listingId'),
    __param(0, (0, common_1.Param)('listingId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "getListingMeetings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "getMeeting", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_meeting_dto_1.UpdateMeetingDto, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "updateMeeting", null);
__decorate([
    (0, common_1.Put)(':id/confirm'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "confirmMeeting", null);
__decorate([
    (0, common_1.Put)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "rejectMeeting", null);
__decorate([
    (0, common_1.Put)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "cancelMeeting", null);
exports.MeetingsController = MeetingsController = __decorate([
    (0, common_1.Controller)('meetings'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __metadata("design:paramtypes", [meetings_service_1.MeetingsService])
], MeetingsController);
//# sourceMappingURL=meetings.controller.js.map