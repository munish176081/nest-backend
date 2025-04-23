import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListingType, ListingTypeEnum } from './entities/listing-type.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ListingTypesService {
  constructor(
    @InjectRepository(ListingType)
    private readonly listingTypeRepo: Repository<ListingType>,
  ) {}

  findByType(type: ListingTypeEnum) {
    return this.listingTypeRepo.findOne({ where: { type } });
  }
}
