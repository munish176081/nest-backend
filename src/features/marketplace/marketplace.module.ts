import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './entities/product.entity';
import { PaymentModule } from '../payment/payment.module';
import { ListingOrdersModule } from '../marketplace-orders/listing-orders.module';
import { ListingTypesModule } from '../category-types/listing-types.module';
import { ListingAdsModule } from '../marketplace-ads/listing-ads.module';
import { ListingAdOrdersModule } from '../marketplace-ad-orders/listing-ad-orders.module';
import { ListingsController } from './marketplace.controller';
import { ListingsService } from './marketplace.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    PaymentModule,
    ListingOrdersModule,
    ListingTypesModule,
    ListingAdsModule,
    ListingAdOrdersModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
