import { Injectable } from '@nestjs/common';
import { ListingTypeEnum } from '../listing-types/entities/listing-type.entity';
import { ListingAd } from './entities/listing-ad.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

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
