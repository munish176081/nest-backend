import {
  ListingTypeEnum,
  listingTypes,
} from 'src/modules/listing-types/entities/listing-type.entity';
import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import { ListingAdsService } from './listing-ads.service';
import { ListingAdDto } from './dto/listing-ad.dto';
import { Serialize } from 'src/interceptors/serialize.interceptor';

@Controller('listing-ads')
export class ListingAdsController {
  constructor(private readonly listingAdsService: ListingAdsService) {}

  @Serialize(ListingAdDto)
  @Get()
  findByListingType(
    @Query('listingType', new ParseEnumPipe(listingTypes))
    listingType: ListingTypeEnum,
  ) {
    return this.listingAdsService.findByListingType(listingType);
  }
}
