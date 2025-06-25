import { Module } from '@nestjs/common';
import { ListingOrdersService } from './listing-orders.service';
import { ListingOrder } from './entities/listing-order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ListingOrder])],
  providers: [ListingOrdersService],
  exports: [ListingOrdersService],
})
export class ListingOrdersModule {}
