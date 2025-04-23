import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { PaymentModule } from '../payment/payment.module';
import { ListingOrdersModule } from '../listing-orders/listing-orders.module';
import { ListingTypesModule } from '../listing-types/listing-types.module';
import { ListingAdsModule } from '../listing-ads/listing-ads.module';
import { ListingAdOrdersModule } from '../listing-ad-orders/listing-ad-orders.module';

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
