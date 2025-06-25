import { Injectable } from '@nestjs/common';
import { ListingAd } from './entities/listing-ad.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ListingTypeEnum } from '../category-types/entities/listing-type.entity';

@Injectable()
export class ListingAdsService {
  constructor(
    @InjectRepository(ListingAd)
    private readonly listingAdRepository: Repository<ListingAd>,
  ) {}

  findByListingType(listingType: ListingTypeEnum) {
    return this.listingAdRepository.findBy([
      { listingType: IsNull() },
      { listingType },
    ]);
  }

  findById(id: number) {
    return this.listingAdRepository.findOneBy({ id });
  }
}
