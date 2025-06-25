import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { configOptions } from './config/options';
import { ExternalAuthAccount } from './features/authentication/entities/external-auth-accounts.entity';
import { User } from './features/accounts/entities/account.entity';
import { ListingType } from './features/category-types/entities/listing-type.entity';
import { Listing } from './features/marketplace/entities/product.entity';
import { ListingOrder } from './features/marketplace-orders/entities/listing-order.entity';
import { ListingAd } from './features/marketplace-ads/entities/listing-ad.entity';
import { ListingAdOrder } from './features/marketplace-ad-orders/entities/listing-ad-order.entity';
import { SnakeCaseNamingStrategy } from './helpers/typeOrmSnakeCaseNamingStrategy';
import { UsersModule } from './features/accounts/users.module';
import { AuthModule } from './features/authentication/authentication.module';
import { EmailModule } from './features/email/email.module';
import { ListingsModule } from './features/marketplace/marketplace.module';
import { ListingTypesModule } from './features/category-types/listing-types.module';
import { ListingOrdersModule } from './features/marketplace-orders/listing-orders.module';
import { PaymentModule } from './features/payment/payment.module';
import { WebhookModule } from './features/webhook/webhook.module';
import { ListingAdsModule } from './features/marketplace-ads/listing-ads.module';
import { ListingAdOrdersModule } from './features/marketplace-ad-orders/listing-ad-orders.module';


@Module({
  imports: [
    ConfigModule.forRoot(configOptions),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('dbUrl'),
        synchronize: true,
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
