import { Module } from '@nestjs/common';
import { ListingAdsService } from './listing-ads.service';
import { ListingAdsController } from './listing-ads.controller';
import { ListingAd } from './entities/listing-ad.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ListingAd])],
  controllers: [ListingAdsController],
  providers: [ListingAdsService],
  exports: [ListingAdsService],
})
export class ListingAdsModule {}
