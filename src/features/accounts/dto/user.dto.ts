import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class UserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  username: string;

  @Expose()
  imageUrl: string;

  @Expose()
  phone?: string;

  @Expose()
  bio?: string;

  @Expose()
  website?: string;

  @Expose()
  businessName?: string;

  @Expose()
  businessABN?: string;

  @Expose()
  description?: string;

  @Expose()
  location?: string;

  @Expose()
  idVerification?: {
    governmentId: string[];
    selfieWithId: string[];
  };

  @Expose()
  createdAt: string;

  @Expose()
  status: string;

  @Expose()
  role: string;

  @Expose()
  isSuperAdmin: boolean;

  @Expose()
  get displayName(): string {
    return this.name || this.username || 'User';
  }
}
