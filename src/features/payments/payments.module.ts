import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentLogsService } from './payment-logs.service';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { Payment } from './entities/payment.entity';
import { Listing } from '../listings/entities/listing.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Listing]),
    AuthModule,
    UsersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentLogsService, LoggedInGuard],
  exports: [PaymentsService, PaymentLogsService],
})
export class PaymentsModule {}

