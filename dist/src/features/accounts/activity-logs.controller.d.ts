interface ActivityLogsQuery {
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
export declare class ActivityLogsController {
    constructor();
    getActivityLogs(query: ActivityLogsQuery): Promise<{
        logs: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getRecentActivities(limit?: string): Promise<{
        logs: any[];
        total: number;
        lastUpdated: string;
    }>;
    getActivityStats(): Promise<{
        totalActivities: number;
        activitiesToday: number;
        activitiesThisWeek: number;
        activitiesThisMonth: number;
        topActivityTypes: any[];
        topActors: any[];
    }>;
    getUserActivities(query: ActivityLogsQuery): Promise<{
        logs: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getActivitiesByType(query: ActivityLogsQuery): Promise<{
        logs: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    cleanOldLogs(): Promise<{
        message: string;
        deletedCount: number;
    }>;
}
export {};
