import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { ActivityLog, ActivityTypeEnum, ActivityLevelEnum } from '../entities/activity-log.entity';
import { CreateActivityLogDto, ActivityLogFilterDto } from '../dto/activity-log.dto';
import { Request } from 'express';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
  ) {}

  // Create a new activity log
  async createActivityLog(
    createDto: CreateActivityLogDto,
    request?: Request,
  ): Promise<ActivityLog> {
    try {
      // Extract IP and User Agent from request if available
      if (request) {
        createDto.ipAddress = request.ip || request.headers['x-forwarded-for'] as string;
        createDto.userAgent = request.headers['user-agent'] as string;
      }

      const activityLog = this.activityLogRepo.create(createDto);
      const savedLog = await this.activityLogRepo.save(activityLog);
      
      this.logger.log(`Activity logged: ${createDto.type} - ${createDto.action}`);
      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to create activity log: ${error.message}`);
      throw error;
    }
  }

  // Get all activity logs with pagination and filtering
  async getActivityLogs(
    filter: ActivityLogFilterDto,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.activityLogRepo.createQueryBuilder('log');

    // Apply filters
    if (filter.type) {
      queryBuilder.andWhere('log.type = :type', { type: filter.type });
    }

    if (filter.level) {
      queryBuilder.andWhere('log.level = :level', { level: filter.level });
    }

    if (filter.actorId) {
      queryBuilder.andWhere('log.actorId = :actorId', { actorId: filter.actorId });
    }

    if (filter.targetId) {
      queryBuilder.andWhere('log.targetId = :targetId', { targetId: filter.targetId });
    }

    if (filter.resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', { resourceType: filter.resourceType });
    }

    if (filter.startDate && filter.endDate) {
      queryBuilder.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(filter.startDate),
        endDate: new Date(filter.endDate),
      });
    }

    if (filter.search) {
      queryBuilder.andWhere(
        '(log.action ILIKE :search OR log.description ILIKE :search OR log.actorEmail ILIKE :search OR log.targetEmail ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    // Add relations and ordering
    queryBuilder
      .leftJoinAndSelect('log.actor', 'actor')
      .leftJoinAndSelect('log.target', 'target')
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get recent activities (last 24 hours)
  async getRecentActivities(limit: number = 50) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const logs = await this.activityLogRepo.find({
      where: {
        createdAt: Between(yesterday, new Date()),
      },
      relations: ['actor', 'target'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      logs,
      total: logs.length,
      lastUpdated: new Date(),
    };
  }

  // Get activity statistics
  async getActivityStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get counts for different time periods
    const [totalActivities, activitiesToday, activitiesThisWeek, activitiesThisMonth] = await Promise.all([
      this.activityLogRepo.count(),
      this.activityLogRepo.count({ where: { createdAt: Between(today, now) } }),
      this.activityLogRepo.count({ where: { createdAt: Between(weekAgo, now) } }),
      this.activityLogRepo.count({ where: { createdAt: Between(monthAgo, now) } }),
    ]);

    // Get top activity types
    const topActivityTypes = await this.activityLogRepo
      .createQueryBuilder('log')
      .select('log.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.type')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Get top actors
    const topActors = await this.activityLogRepo
      .createQueryBuilder('log')
      .select('log.actorId', 'actorId')
      .addSelect('log.actorEmail', 'actorEmail')
      .addSelect('COUNT(*)', 'count')
      .where('log.actorId IS NOT NULL')
      .groupBy('log.actorId')
      .addGroupBy('log.actorEmail')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalActivities,
      activitiesToday,
      activitiesThisWeek,
      activitiesThisMonth,
      topActivityTypes,
      topActors,
    };
  }

  // Get activities by user
  async getUserActivities(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await this.activityLogRepo.findAndCount({
      where: [
        { actorId: userId },
        { targetId: userId },
      ],
      relations: ['actor', 'target'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get activities by type
  async getActivitiesByType(type: ActivityTypeEnum, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await this.activityLogRepo.findAndCount({
      where: { type },
      relations: ['actor', 'target'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Clean old logs (keep last 90 days)
  async cleanOldLogs() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.activityLogRepo.delete({
      createdAt: Between(new Date(0), ninetyDaysAgo),
    });

    this.logger.log(`Cleaned ${result.affected} old activity logs`);
    return result.affected;
  }

  // Helper method to log admin actions
  async logAdminAction(
    adminUser: any,
    action: string,
    targetUser?: any,
    metadata?: Record<string, any>,
    request?: Request,
  ) {
    const createDto: CreateActivityLogDto = {
      type: ActivityTypeEnum.ADMIN_ACTION,
      level: ActivityLevelEnum.INFO,
      action,
      description: `${adminUser.email} performed: ${action}`,
      metadata,
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
    };

    if (targetUser) {
      createDto.targetId = targetUser.id;
      createDto.targetEmail = targetUser.email;
      createDto.targetType = 'user';
    }

    return await this.createActivityLog(createDto, request);
  }

  // Helper method to log user actions
  async logUserAction(
    user: any,
    action: string,
    type: ActivityTypeEnum = ActivityTypeEnum.USER_UPDATED,
    metadata?: Record<string, any>,
    request?: Request,
  ) {
    const createDto: CreateActivityLogDto = {
      type,
      level: ActivityLevelEnum.INFO,
      action,
      description: `${user.email} performed: ${action}`,
      metadata,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
    };

    return await this.createActivityLog(createDto, request);
  }
} 