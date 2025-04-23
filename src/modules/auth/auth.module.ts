import {
  MiddlewareConsumer,
  Module,
  NestModule,
  forwardRef,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './providers/google';
import { FacebookStrategy } from './providers/facebook';
import { LocalStrategy } from './providers/local';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalAuthAccount } from './entities/external-auth-accounts.entity';
import { SessionSerializer } from './utils/passport-serializer';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { PrepareLoginMiddleware } from './prepare-login.middleware';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule.register({ session: true, keepSessionInfo: true }),
    TypeOrmModule.forFeature([ExternalAuthAccount]),
    forwardRef(() => UsersModule),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    FacebookStrategy,
    LocalStrategy,
    SessionSerializer,
  ],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PrepareLoginMiddleware)
      .forRoutes('/auth/google$', '/auth/facebook$', '/auth/login$');
  }
}
