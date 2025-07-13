import { Expose } from 'class-transformer';
import { ActivityTypeEnum, ActivityLevelEnum } from '../entities/activity-log.entity';

export class CreateActivityLogDto {
  type: ActivityTypeEnum;
  level?: ActivityLevelEnum;
  action: string;
  description?: string;
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

export class ActivityLogDto {
  @Expose()
  id: string;

  @Expose()
  type: ActivityTypeEnum;

  @Expose()
  level: ActivityLevelEnum;

  @Expose()
  action: string;

  @Expose()
  description: string;

  @Expose()
  metadata: Record<string, any>;

  @Expose()
  ipAddress: string;

  @Expose()
  userAgent: string;

  @Expose()
  resourceId: string;

  @Expose()
  resourceType: string;

  @Expose()
  actorId: string;

  @Expose()
  actorEmail: string;

  @Expose()
  actorRole: string;

  @Expose()
  targetId: string;

  @Expose()
  targetEmail: string;

  @Expose()
  targetType: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class ActivityLogListDto {
  @Expose()
  logs: ActivityLogDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
}

export class ActivityLogFilterDto {
  type?: ActivityTypeEnum;
  level?: ActivityLevelEnum;
  actorId?: string;
  targetId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class RecentActivityDto {
  @Expose()
  logs: ActivityLogDto[];

  @Expose()
  total: number;

  @Expose()
  lastUpdated: Date;
}

export class ActivityStatsDto {
  @Expose()
  totalActivities: number;

  @Expose()
  activitiesToday: number;

  @Expose()
  activitiesThisWeek: number;

  @Expose()
  activitiesThisMonth: number;

  @Expose()
  topActivityTypes: Array<{
    type: ActivityTypeEnum;
    count: number;
  }>;

  @Expose()
  topActors: Array<{
    actorId: string;
    actorEmail: string;
    count: number;
  }>;
} 