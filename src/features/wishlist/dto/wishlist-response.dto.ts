import { Expose } from 'class-transformer';

export class WishlistResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  listingId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  listing?: {
    id: string;
    title: string;
    price: number;
    breed: string;
    location: string;
    imageUrl?: string;
  };
}

export class WishlistStatusDto {
  @Expose()
  listingId: string;

  @Expose()
  isWishlisted: boolean;
}
