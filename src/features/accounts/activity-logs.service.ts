import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { ActivityLog, ActivityLevelEnum, ActivityTypeEnum } from './entities/activity-log.entity';

export interface CreateActivityLogDto {
  type: ActivityTypeEnum;
  level: ActivityLevelEnum;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  resourceId?: string;
  resourceType?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetId?: string;
  targetEmail?: string;
  targetType?: string;
}

export interface ActivityLogsQuery {
  page?: number;
  limit?: number;
  type?: string;
  level?: string;
  actorId?: string;
  targetId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {}

  async createActivityLog(createDto: CreateActivityLogDto): Promise<ActivityLog> {
    const activityLog = this.activityLogRepository.create(createDto);
    return this.activityLogRepository.save(activityLog);
  }

  async getActivityLogs(query: ActivityLogsQuery = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      level,
      actorId,
      targetId,
      resourceType,
      startDate,
      endDate,
      search,
    } = query;

    const queryBuilder = this.activityLogRepository
      .createQueryBuilder('activityLog')
      .leftJoinAndSelect('activityLog.actor', 'actor')
      .leftJoinAndSelect('activityLog.target', 'target')
      .orderBy('activityLog.createdAt', 'DESC');

    // Apply filters
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
      queryBuilder.andWhere(
        '(activityLog.action ILIKE :search OR activityLog.description ILIKE :search OR activityLog.actorEmail ILIKE :search OR activityLog.targetEmail ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
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

  async getRecentActivities(limit: number = 50) {
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

    const [
      totalActivities,
      activitiesToday,
      activitiesThisWeek,
      activitiesThisMonth,
      topActivityTypes,
      topActors,
    ] = await Promise.all([
      this.activityLogRepository.count(),
      this.activityLogRepository.count({
        where: { createdAt: Between(today, now) },
      }),
      this.activityLogRepository.count({
        where: { createdAt: Between(weekAgo, now) },
      }),
      this.activityLogRepository.count({
        where: { createdAt: Between(monthAgo, now) },
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

  async getUserActivities(userId: string, page: number = 1, limit: number = 20) {
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

  async getActivitiesByType(type: string, page: number = 1, limit: number = 20) {
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

  async cleanOldLogs(daysToKeep: number = 90) {
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

  // Helper method to log user signup
  async logUserSignup(user: any, ipAddress?: string, userAgent?: string) {
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

  // Helper method to log listing creation
  async logListingCreation(listing: any, user: any, ipAddress?: string, userAgent?: string) {
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
}
