import { Module } from '@nestjs/common';
import { ListingAdOrdersService } from './listing-ad-orders.service';
import { ListingAdOrdersController } from './listing-ad-orders.controller';
import { ListingAdOrder } from './entities/listing-ad-order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ListingAdOrder])],
  controllers: [ListingAdOrdersController],
  providers: [ListingAdOrdersService],
  exports: [ListingAdOrdersService],
})
export class ListingAdOrdersModule {}
