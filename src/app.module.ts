import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { SnakeCaseNamingStrategy } from './utils/typeOrmSnakeCaseNamingStrategy';
import { AuthModule } from './modules/auth/auth.module';
import { ExternalAuthAccount } from './modules/auth/entities/external-auth-accounts.entity';
import { User } from './modules/users/entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configOptions } from './config/options';
import { EmailModule } from './modules/email/email.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ListingType } from './modules/listing-types/entities/listing-type.entity';
import { Listing } from './modules/listings/entities/listing.entity';
import { PaymentModule } from './modules/payment/payment.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { ListingOrdersModule } from './modules/listing-orders/listing-orders.module';
import { ListingOrder } from './modules/listing-orders/entities/listing-order.entity';
import { ListingTypesModule } from './modules/listing-types/listing-types.module';
import { ListingAdsModule } from './modules/listing-ads/listing-ads.module';
import { ListingAd } from './modules/listing-ads/entities/listing-ad.entity';
import { ListingAdOrdersModule } from './modules/listing-ad-orders/listing-ad-orders.module';
import { ListingAdOrder } from './modules/listing-ad-orders/entities/listing-ad-order.entity';

@Module({
  imports: [
    ConfigModule.forRoot(configOptions),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('dbUrl'),
        synchronize: false,
        entities: [
          ExternalAuthAccount,
          User,
          ListingType,
          Listing,
          ListingOrder,
          ListingAd,
          ListingAdOrder,
        ],
        namingStrategy: new SnakeCaseNamingStrategy(),
        logging: configService.get('env') === 'development',
        ssl: configService.get('env') === 'production',
        extra: {
          ...(configService.get('env') === 'production' && {
            ssl: {
              rejectUnauthorized: false,
            },
          }),
        },
      }),
    }),
    UsersModule,
    AuthModule,
    EmailModule,
    ListingsModule,
    ListingTypesModule,
    ListingOrdersModule,
    PaymentModule,
    WebhookModule,
    ListingAdsModule,
    ListingAdOrdersModule,
  ],
  providers: [],
})
export class AppModule {}
