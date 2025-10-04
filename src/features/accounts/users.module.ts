import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminController } from './admin.controller';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsModule } from '../listings/listings.module';
import { User } from './entities/account.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { AuthModule } from '../authentication/authentication.module';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { AdminGuard } from '../../middleware/AdminGuard';
import { ActiveUserGuard } from '../../middleware/ActiveUserGuard';


@Module({
  imports: [
    TypeOrmModule.forFeature([User, ActivityLog]), 
    forwardRef(() => ListingsModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, AdminController, ActivityLogsController],
  providers: [UsersService, ActivityLogsService, LoggedInGuard, AdminGuard, ActiveUserGuard],
  exports: [UsersService, ActivityLogsService],
})
export class UsersModule {}
