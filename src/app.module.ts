import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { configOptions } from './config/options';
import { ExternalAuthAccount } from './features/authentication/entities/external-auth-accounts.entity';
import { User } from './features/accounts/entities/account.entity';
import { SnakeCaseNamingStrategy } from './helpers/typeOrmSnakeCaseNamingStrategy';
import { UsersModule } from './features/accounts/users.module';
import { AuthModule } from './features/authentication/authentication.module';
import { EmailModule } from './features/email/email.module';



@Module({
  imports: [
    ConfigModule.forRoot(configOptions),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
    
        return {
          type: 'postgres',
          url: configService.get('dbUrl'),
          synchronize: true,
          entities: [ExternalAuthAccount, User],
          namingStrategy: new SnakeCaseNamingStrategy(),
          logging: !isProduction,
    
          // ✅ Final working setup: one ssl object only
          ssl: {
            rejectUnauthorized: false,
          },
          extra: {
            ssl: {
              rejectUnauthorized: false,
            },
          },
        };
      },
    }),
    UsersModule,
    AuthModule,
    EmailModule,
  ],
  providers: [],
})
export class AppModule {}
