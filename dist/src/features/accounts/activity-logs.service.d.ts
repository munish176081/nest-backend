import { Repository } from 'typeorm';
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
export declare class ActivityLogsService {
    private activityLogRepository;
    constructor(activityLogRepository: Repository<ActivityLog>);
    createActivityLog(createDto: CreateActivityLogDto): Promise<ActivityLog>;
    getActivityLogs(query?: ActivityLogsQuery): Promise<{
        logs: ActivityLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getRecentActivities(limit?: number): Promise<{
        logs: ActivityLog[];
        total: number;
        lastUpdated: string;
    }>;
    getActivityStats(): Promise<{
        totalActivities: number;
        activitiesToday: number;
        activitiesThisWeek: number;
        activitiesThisMonth: number;
        topActivityTypes: {
            type: any;
            count: number;
        }[];
        topActors: {
            actorId: any;
            actorEmail: any;
            count: number;
        }[];
    }>;
    getUserActivities(userId: string, page?: number, limit?: number): Promise<{
        logs: ActivityLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getActivitiesByType(type: string, page?: number, limit?: number): Promise<{
        logs: ActivityLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    cleanOldLogs(daysToKeep?: number): Promise<{
        message: string;
        deletedCount: number;
    }>;
    logUserSignup(user: any, ipAddress?: string, userAgent?: string): Promise<ActivityLog>;
    logListingCreation(listing: any, user: any, ipAddress?: string, userAgent?: string): Promise<ActivityLog>;
}
