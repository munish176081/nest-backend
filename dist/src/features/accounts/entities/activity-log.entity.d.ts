import { User } from './account.entity';
export type ActivityLevelEnum = 'info' | 'warning' | 'error' | 'critical';
export type ActivityTypeEnum = 'user' | 'admin' | 'system' | 'listing' | 'meeting' | 'auth';
export declare class ActivityLog {
    id: string;
    type: ActivityTypeEnum;
    level: ActivityLevelEnum;
    action: string;
    description: string;
    metadata: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    resourceId: string;
    resourceType: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    targetId: string;
    targetEmail: string;
    targetType: string;
    actor: User;
    target: User;
    createdAt: Date;
    updatedAt: Date;
}
