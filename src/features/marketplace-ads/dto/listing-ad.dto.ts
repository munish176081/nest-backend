import { Expose, Type } from 'class-transformer';

class ListingAdProductDto {
  @Expose()
  price: number;

  @Expose()
  durationInDays: number;

  @Expose()
  description?: string;
}

export class ListingAdDto {
  @Expose()
  id: number;

  @Expose()
  listingType: string;

  @Expose()
  adType: string;

  @Expose()
  title: string;

  @Expose()
  description?: string;

  @Expose()
  @Type(() => ListingAdProductDto)
  products: ListingAdProductDto[];
}
