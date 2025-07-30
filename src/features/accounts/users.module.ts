import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminController } from './admin.controller';
import { ActivityLogsController } from './activity-logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsModule } from '../listings/listings.module';
import { User } from './entities/account.entity';
import { AuthModule } from '../authentication/authentication.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([User]), 
    ListingsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, AdminController, ActivityLogsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
