import { IsEnum, IsObject } from 'class-validator';
import {
  ListingTypeEnum,
  listingTypes,
} from 'src/modules/listing-types/entities/listing-type.entity';

export class CreateListingDto {
  @IsEnum(listingTypes, { message: 'Invalid listing type' })
  type: ListingTypeEnum;

  @IsObject()
  fields: Record<string, any>;
}
