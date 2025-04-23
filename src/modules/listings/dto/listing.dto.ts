import { Expose } from 'class-transformer';

export class ListingDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  fields: Record<string, any>;

  @Expose()
  userId: string;

  @Expose()
  status: string;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;
}
