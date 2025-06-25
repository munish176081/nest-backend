import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingType } from './entities/listing-type.entity';
import { ListingTypesController } from './listing-types.controller';
import { ListingTypesService } from './listing-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([ListingType])],
  controllers: [ListingTypesController],
  providers: [ListingTypesService],
  exports: [ListingTypesService],
})
export class ListingTypesModule {}
