import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionWebhooksController } from './webhooks/subscription-webhooks.controller';
import { Subscription } from './entities/subscription.entity';
import { Listing } from '../listings/entities/listing.entity';
import { PaymentLogsService } from '../payments/payment-logs.service';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Listing]),
    AuthModule,
    UsersModule,
  ],
  controllers: [SubscriptionsController, SubscriptionWebhooksController],
  providers: [SubscriptionsService, PaymentLogsService, LoggedInGuard],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

