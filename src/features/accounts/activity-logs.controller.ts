import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { ActiveUserGuard } from '../../middleware/ActiveUserGuard';
import { AdminGuard } from '../../middleware/AdminGuard';
import { ActivityLogsService, ActivityLogsQuery } from './activity-logs.service';

@Controller('admin/activity-logs')
@UseGuards(LoggedInGuard, ActiveUserGuard, AdminGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  async getActivityLogs(@Query() query: ActivityLogsQuery) {
    return this.activityLogsService.getActivityLogs(query);
  }

  @Get('recent')
  async getRecentActivities(@Query('limit') limit: string = '50') {
    const limitNum = parseInt(limit);
    return this.activityLogsService.getRecentActivities(limitNum);
  }

  @Get('stats')
  async getActivityStats() {
    return this.activityLogsService.getActivityStats();
  }

  @Get('user/:userId')
  async getUserActivities(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    return this.activityLogsService.getUserActivities(userId, pageNum, limitNum);
  }

  @Get('type/:type')
  async getActivitiesByType(
    @Param('type') type: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    return this.activityLogsService.getActivitiesByType(type, pageNum, limitNum);
  }

  @Get('clean/old-logs')
  async cleanOldLogs(@Query('days') days: string = '90') {
    const daysToKeep = parseInt(days);
    return this.activityLogsService.cleanOldLogs(daysToKeep);
  }
} 