import { Expose, Type } from 'class-transformer';

class ListingTypeProductDto {
  @Expose()
  price: number;

  @Expose()
  durationInDays: number;

  @Expose()
  title?: string;

  @Expose()
  description?: string;
}

export class ListingProductDto {
  @Expose()
  type: string;

  @Expose()
  @Type(() => ListingTypeProductDto)
  products: ListingTypeProductDto[];
}
