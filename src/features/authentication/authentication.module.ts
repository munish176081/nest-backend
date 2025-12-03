import {
  MiddlewareConsumer,
  Module,
  NestModule,
  forwardRef,
} from '@nestjs/common';
import { GoogleStrategy } from './providers/google';
import { FacebookStrategy } from './providers/facebook';
import { LocalStrategy } from './providers/local';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalAuthAccount } from './entities/external-auth-accounts.entity';
import { SessionSerializer } from './utils/passport-serializer';
import { PassportModule } from '@nestjs/passport';
import { PrepareLoginMiddleware } from './prepare-login.middleware';
import { EmailModule } from '../email/email.module';
import { SessionService } from './session.service';
import { OtpService } from './otp.service';
import { UsersModule } from '../accounts/users.module';
import { AuthController } from './authentication.controller';
import { AuthService } from './authentication.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    PassportModule.register({ session: true, keepSessionInfo: true }),
    TypeOrmModule.forFeature([ExternalAuthAccount]),
    forwardRef(() => UsersModule),
    EmailModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    FacebookStrategy,
    LocalStrategy,
    SessionSerializer,
    SessionService,
    OtpService,
  ],
  exports: [AuthService, SessionService, OtpService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PrepareLoginMiddleware)
      .forRoutes('/auth/google$', '/auth/facebook$', '/auth/login$');
  }
}
