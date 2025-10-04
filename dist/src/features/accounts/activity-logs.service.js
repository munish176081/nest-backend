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
exports.ActivityLogsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const activity_log_entity_1 = require("./entities/activity-log.entity");
let ActivityLogsService = class ActivityLogsService {
    constructor(activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }
    async createActivityLog(createDto) {
        const activityLog = this.activityLogRepository.create(createDto);
        return this.activityLogRepository.save(activityLog);
    }
    async getActivityLogs(query = {}) {
        const { page = 1, limit = 20, type, level, actorId, targetId, resourceType, startDate, endDate, search, } = query;
        const queryBuilder = this.activityLogRepository
            .createQueryBuilder('activityLog')
            .leftJoinAndSelect('activityLog.actor', 'actor')
            .leftJoinAndSelect('activityLog.target', 'target')
            .orderBy('activityLog.createdAt', 'DESC');
        if (type) {
            queryBuilder.andWhere('activityLog.type = :type', { type });
        }
        if (level) {
            queryBuilder.andWhere('activityLog.level = :level', { level });
        }
        if (actorId) {
            queryBuilder.andWhere('activityLog.actorId = :actorId', { actorId });
        }
        if (targetId) {
            queryBuilder.andWhere('activityLog.targetId = :targetId', { targetId });
        }
        if (resourceType) {
            queryBuilder.andWhere('activityLog.resourceType = :resourceType', { resourceType });
        }
        if (startDate && endDate) {
            queryBuilder.andWhere('activityLog.createdAt BETWEEN :startDate AND :endDate', {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });
        }
        if (search) {
            queryBuilder.andWhere('(activityLog.action ILIKE :search OR activityLog.description ILIKE :search OR activityLog.actorEmail ILIKE :search OR activityLog.targetEmail ILIKE :search)', { search: `%${search}%` });
        }
        const total = await queryBuilder.getCount();
        const offset = (page - 1) * limit;
        queryBuilder.skip(offset).take(limit);
        const logs = await queryBuilder.getMany();
        return {
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getRecentActivities(limit = 50) {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const logs = await this.activityLogRepository
            .createQueryBuilder('activityLog')
            .leftJoinAndSelect('activityLog.actor', 'actor')
            .leftJoinAndSelect('activityLog.target', 'target')
            .where('activityLog.createdAt >= :oneDayAgo', { oneDayAgo })
            .orderBy('activityLog.createdAt', 'DESC')
            .limit(limit)
            .getMany();
        return {
            logs,
            total: logs.length,
            lastUpdated: new Date().toISOString(),
        };
    }
    async getActivityStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const [totalActivities, activitiesToday, activitiesThisWeek, activitiesThisMonth, topActivityTypes, topActors,] = await Promise.all([
            this.activityLogRepository.count(),
            this.activityLogRepository.count({
                where: { createdAt: (0, typeorm_2.Between)(today, now) },
            }),
            this.activityLogRepository.count({
                where: { createdAt: (0, typeorm_2.Between)(weekAgo, now) },
            }),
            this.activityLogRepository.count({
                where: { createdAt: (0, typeorm_2.Between)(monthAgo, now) },
            }),
            this.activityLogRepository
                .createQueryBuilder('activityLog')
                .select('activityLog.type', 'type')
                .addSelect('COUNT(*)', 'count')
                .groupBy('activityLog.type')
                .orderBy('count', 'DESC')
                .limit(5)
                .getRawMany(),
            this.activityLogRepository
                .createQueryBuilder('activityLog')
                .select('activityLog.actorId', 'actorId')
                .addSelect('activityLog.actorEmail', 'actorEmail')
                .addSelect('COUNT(*)', 'count')
                .where('activityLog.actorId IS NOT NULL')
                .groupBy('activityLog.actorId, activityLog.actorEmail')
                .orderBy('count', 'DESC')
                .limit(5)
                .getRawMany(),
        ]);
        return {
            totalActivities,
            activitiesToday,
            activitiesThisWeek,
            activitiesThisMonth,
            topActivityTypes: topActivityTypes.map(item => ({
                type: item.type,
                count: parseInt(item.count),
            })),
            topActors: topActors.map(item => ({
                actorId: item.actorId,
                actorEmail: item.actorEmail,
                count: parseInt(item.count),
            })),
        };
    }
    async getUserActivities(userId, page = 1, limit = 20) {
        const queryBuilder = this.activityLogRepository
            .createQueryBuilder('activityLog')
            .leftJoinAndSelect('activityLog.actor', 'actor')
            .leftJoinAndSelect('activityLog.target', 'target')
            .where('activityLog.actorId = :userId OR activityLog.targetId = :userId', { userId })
            .orderBy('activityLog.createdAt', 'DESC');
        const total = await queryBuilder.getCount();
        const offset = (page - 1) * limit;
        const logs = await queryBuilder.skip(offset).take(limit).getMany();
        return {
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getActivitiesByType(type, page = 1, limit = 20) {
        const queryBuilder = this.activityLogRepository
            .createQueryBuilder('activityLog')
            .leftJoinAndSelect('activityLog.actor', 'actor')
            .leftJoinAndSelect('activityLog.target', 'target')
            .where('activityLog.type = :type', { type })
            .orderBy('activityLog.createdAt', 'DESC');
        const total = await queryBuilder.getCount();
        const offset = (page - 1) * limit;
        const logs = await queryBuilder.skip(offset).take(limit).getMany();
        return {
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async cleanOldLogs(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await this.activityLogRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoffDate', { cutoffDate })
            .execute();
        return {
            message: 'Old logs cleaned successfully',
            deletedCount: result.affected || 0,
        };
    }
    async logUserSignup(user, ipAddress, userAgent) {
        return this.createActivityLog({
            type: 'auth',
            level: 'info',
            action: 'user_signup',
            description: `New user ${user.email} signed up`,
            metadata: {
                userId: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                status: user.status,
            },
            ipAddress,
            userAgent,
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            resourceId: user.id,
            resourceType: 'user',
        });
    }
    async logListingCreation(listing, user, ipAddress, userAgent) {
        return this.createActivityLog({
            type: 'listing',
            level: 'info',
            action: 'listing_created',
            description: `New ${listing.type} listing "${listing.title}" created by ${user.email}`,
            metadata: {
                listingId: listing.id,
                listingType: listing.type,
                listingCategory: listing.category,
                listingTitle: listing.title,
                listingBreed: listing.breed,
                listingPrice: listing.price,
                userId: user.id,
                userEmail: user.email,
            },
            ipAddress,
            userAgent,
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            resourceId: listing.id,
            resourceType: 'listing',
        });
    }
};
exports.ActivityLogsService = ActivityLogsService;
exports.ActivityLogsService = ActivityLogsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(activity_log_entity_1.ActivityLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ActivityLogsService);
//# sourceMappingURL=activity-logs.service.js.map