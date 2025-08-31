import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { OAuthCalendarService } from './oauth-calendar.service';
import { UserCalendarTokensService } from './user-calendar-tokens.service';
import { OAuthCalendarController } from './oauth-calendar.controller';
import { CalendarWebhookController } from './calendar-webhook.controller';
import { Meeting } from './entities/meeting.entity';
import { UserCalendarTokens } from './entities/user-calendar-tokens.entity';
import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../accounts/users.module';
import { AuthModule } from '../authentication/authentication.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, UserCalendarTokens]),
    ListingsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [MeetingsController, OAuthCalendarController, CalendarWebhookController],
  providers: [MeetingsService, OAuthCalendarService, UserCalendarTokensService],
  exports: [MeetingsService, OAuthCalendarService, UserCalendarTokensService],
})
export class MeetingsModule {}
