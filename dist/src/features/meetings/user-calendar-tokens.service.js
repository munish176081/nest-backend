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
exports.UserCalendarTokensService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_calendar_tokens_entity_1 = require("./entities/user-calendar-tokens.entity");
let UserCalendarTokensService = class UserCalendarTokensService {
    constructor(userCalendarTokensRepository) {
        this.userCalendarTokensRepository = userCalendarTokensRepository;
    }
    async storeTokens(userId, accessToken, refreshToken, expiryDate, scope, calendarId) {
        try {
            let userTokens = await this.userCalendarTokensRepository.findOne({
                where: { userId }
            });
            if (userTokens) {
                userTokens.accessToken = accessToken;
                userTokens.refreshToken = refreshToken || userTokens.refreshToken;
                userTokens.expiryDate = expiryDate || userTokens.expiryDate;
                userTokens.scope = scope || userTokens.scope;
                userTokens.calendarId = calendarId || userTokens.calendarId;
                userTokens.isActive = true;
                userTokens.updatedAt = new Date();
            }
            else {
                userTokens = this.userCalendarTokensRepository.create({
                    userId,
                    accessToken,
                    refreshToken,
                    expiryDate,
                    scope,
                    calendarId,
                    isActive: true,
                });
            }
            return await this.userCalendarTokensRepository.save(userTokens);
        }
        catch (error) {
            console.error('Error storing calendar tokens:', error);
            throw new common_1.BadRequestException('Failed to store calendar tokens');
        }
    }
    async getTokens(userId) {
        try {
            const tokens = await this.userCalendarTokensRepository.findOne({
                where: { userId, isActive: true }
            });
            if (!tokens) {
                return null;
            }
            return tokens;
        }
        catch (error) {
            console.error('Error retrieving calendar tokens:', error);
            return null;
        }
    }
    async getValidAccessToken(userId) {
        const tokens = await this.getTokens(userId);
        return tokens?.accessToken || null;
    }
    async updateTokensAfterRefresh(userId, newAccessToken, newExpiryDate) {
        try {
            const tokens = await this.userCalendarTokensRepository.findOne({
                where: { userId, isActive: true }
            });
            if (tokens) {
                tokens.accessToken = newAccessToken;
                if (newExpiryDate) {
                    tokens.expiryDate = newExpiryDate;
                }
                tokens.updatedAt = new Date();
                await this.userCalendarTokensRepository.save(tokens);
                console.log(`✅ Updated tokens for user ${userId} after refresh`);
            }
        }
        catch (error) {
            console.error('Error updating tokens after refresh:', error);
        }
    }
    async findByRefreshToken(refreshToken) {
        try {
            return await this.userCalendarTokensRepository.findOne({
                where: { refreshToken, isActive: true }
            });
        }
        catch (error) {
            console.error('Error finding tokens by refresh token:', error);
            return null;
        }
    }
    async markTokensAsInvalid(userId) {
        try {
            const tokens = await this.userCalendarTokensRepository.findOne({
                where: { userId, isActive: true }
            });
            if (tokens) {
                tokens.isActive = false;
                tokens.updatedAt = new Date();
                await this.userCalendarTokensRepository.save(tokens);
                console.log(`🚫 Marked tokens as invalid for user ${userId}`);
            }
        }
        catch (error) {
            console.error('Error marking tokens as invalid:', error);
        }
    }
    async revokeAccess(userId) {
        try {
            const tokens = await this.userCalendarTokensRepository.findOne({
                where: { userId }
            });
            if (tokens) {
                tokens.isActive = false;
                await this.userCalendarTokensRepository.save(tokens);
            }
        }
        catch (error) {
            console.error('Error revoking calendar access:', error);
        }
    }
    async hasActiveIntegration(userId) {
        const tokens = await this.getTokens(userId);
        return !!tokens && tokens.isActive;
    }
    async getUsersWithActiveIntegration() {
        try {
            const tokens = await this.userCalendarTokensRepository.find({
                where: { isActive: true },
                select: ['userId']
            });
            return tokens.map(token => token.userId);
        }
        catch (error) {
            console.error('Error getting users with active integration:', error);
            return [];
        }
    }
};
exports.UserCalendarTokensService = UserCalendarTokensService;
exports.UserCalendarTokensService = UserCalendarTokensService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_calendar_tokens_entity_1.UserCalendarTokens)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserCalendarTokensService);
//# sourceMappingURL=user-calendar-tokens.service.js.map