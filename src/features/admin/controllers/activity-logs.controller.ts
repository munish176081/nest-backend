import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ActivityLogService } from '../services/activity-log.service';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { Serialize } from '../../../transformers/serialize.interceptor';
import {
  ActivityLogListDto,
  RecentActivityDto,
  ActivityStatsDto,
  ActivityLogFilterDto,
} from '../dto/activity-log.dto';
import { ActivityTypeEnum } from '../entities/activity-log.entity';

@Controller('admin/activity-logs')
@UseGuards(SuperAdminGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  // Get all activity logs with filtering and pagination
  @Get()
  @Serialize(ActivityLogListDto)
  async getActivityLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: ActivityTypeEnum,
    @Query('level') level?: string,
    @Query('actorId') actorId?: string,
    @Query('targetId') targetId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const filter: ActivityLogFilterDto = {
      type,
      level: level as any,
      actorId,
      targetId,
      resourceType,
      startDate,
      endDate,
      search,
    };

    return await this.activityLogService.getActivityLogs(filter, page, limit);
  }

  // Get recent activities (last 24 hours)
  @Get('recent')
  @Serialize(RecentActivityDto)
  async getRecentActivities(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return await this.activityLogService.getRecentActivities(limit);
  }

  // Get activity statistics
  @Get('stats')
  @Serialize(ActivityStatsDto)
  async getActivityStats() {
    return await this.activityLogService.getActivityStats();
  }

  // Get activities by user
  @Get('user/:userId')
  @Serialize(ActivityLogListDto)
  async getUserActivities(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.activityLogService.getUserActivities(userId, page, limit);
  }

  // Get activities by type
  @Get('type/:type')
  @Serialize(ActivityLogListDto)
  async getActivitiesByType(
    @Param('type') type: ActivityTypeEnum,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.activityLogService.getActivitiesByType(type, page, limit);
  }

  // Get specific activity log
  @Get(':id')
  async getActivityLog(@Param('id', ParseUUIDPipe) id: string) {
    // This would need to be implemented in the service
    // For now, we'll return a placeholder
    return { message: 'Activity log details endpoint - to be implemented' };
  }

  // Clean old logs (admin maintenance)
  @Get('clean/old-logs')
  async cleanOldLogs() {
    const deletedCount = await this.activityLogService.cleanOldLogs();
    return {
      message: `Cleaned ${deletedCount} old activity logs`,
      deletedCount,
    };
  }
} 