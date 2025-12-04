import { ActivityLogsService, ActivityLogsQuery } from './activity-logs.service';
export declare class ActivityLogsController {
    private readonly activityLogsService;
    constructor(activityLogsService: ActivityLogsService);
    getActivityLogs(query: ActivityLogsQuery): Promise<{
        logs: import("./entities/activity-log.entity").ActivityLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getRecentActivities(limit?: string): Promise<{
        logs: import("./entities/activity-log.entity").ActivityLog[];
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
    getUserActivities(userId: string, page?: string, limit?: string): Promise<{
        logs: import("./entities/activity-log.entity").ActivityLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getActivitiesByType(type: string, page?: string, limit?: string): Promise<{
        logs: import("./entities/activity-log.entity").ActivityLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    cleanOldLogs(days?: string): Promise<{
        message: string;
        deletedCount: number;
    }>;
}
