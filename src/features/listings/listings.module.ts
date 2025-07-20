import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsService } from './listings.service';
import { ListingsRepository } from './listings.repository';
import { Listing } from './entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Listing])],
  providers: [ListingsService, ListingsRepository],
  exports: [ListingsService, ListingsRepository],
})
export class ListingsModule {} 