import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { Meeting } from './entities/meeting.entity';
import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../accounts/users.module';
import { AuthModule } from '../authentication/authentication.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting]),
    ListingsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
