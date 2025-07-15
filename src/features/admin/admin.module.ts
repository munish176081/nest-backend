import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SeederService } from './seeder.service';
import { ActivityLogsController } from './controllers/activity-logs.controller';
import { ActivityLogService } from './services/activity-log.service';
import { AdminActionLoggerInterceptor } from './interceptors/admin-action-logger.interceptor';
import { User } from '../accounts/entities/account.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { UsersModule } from '../accounts/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ActivityLog]),
    UsersModule,
  ],
  controllers: [AdminController, ActivityLogsController],
  providers: [
    AdminService, 
    SeederService, 
    ActivityLogService,
    AdminActionLoggerInterceptor,
  ],
  exports: [AdminService, SeederService, ActivityLogService],
})
export class AdminModule {} 