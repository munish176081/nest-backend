import { Expose } from 'class-transformer';
//user listings
export class UserListings {
  @Expose()
  id: string;

  @Expose()
  'userId': string;

  @Expose()
  status: string;

  @Expose()
  type: string;

  @Expose()
  fields: Record<string, unknown>;

  @Expose()
  expiresAt: string;

  @Expose()
  startedOrRenewedAt: string;
}

export class UserListing {
  @Expose()
  id: string;

  @Expose()
  'userId': string;

  @Expose()
  status: string;

  @Expose()
  type: string;

  @Expose()
  fields: Record<string, unknown>;

  @Expose()
  expiresAt: string;

  @Expose()
  startedOrRenewedAt: string;
}
