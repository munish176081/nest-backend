import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { Payment } from './entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    AuthModule,
    UsersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, LoggedInGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}

