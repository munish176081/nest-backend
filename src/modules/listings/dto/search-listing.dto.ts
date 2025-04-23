import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ListingTypeEnum,
  listingTypes,
} from 'src/modules/listing-types/entities/listing-type.entity';

class SearchListingLocation {
  @Expose()
  address: string;
}

class ContactDetails {
  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  @Type(() => SearchListingLocation)
  location: SearchListingLocation;

  @Expose()
  phoneNumber: string;

  @Expose()
  additionalNotes: string;
}
//

class SearchListingFields {
  @Expose()
  breed: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  fee: string;

  @Expose()
  budget: string;

  @Expose()
  pricePerPuppy: string;

  @Expose()
  referenceImages: string[];

  @Expose()
  images: string[];

  @Expose()
  @Type(() => ContactDetails)
  contactDetails: ContactDetails;

  @Expose()
  @Type(() => SearchListingLocation)
  contactInformation: SearchListingLocation;
}

export class SearchListingDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  @Type(() => SearchListingFields)
  fields: SearchListingFields;
}

class LocationSearch {
  @Min(-90)
  @Max(90)
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lat: number;

  @Min(-180)
  @Max(180)
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lng: number;
}

export class SearchListingQuery {
  @IsOptional()
  @IsEnum(listingTypes, { each: true })
  @IsArray()
  types?: ListingTypeEnum[];

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @Min(1)
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  minPrice?: string;

  @IsOptional()
  @Max(100_00_000)
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxPrice?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LocationSearch)
  location?: LocationSearch;
}
