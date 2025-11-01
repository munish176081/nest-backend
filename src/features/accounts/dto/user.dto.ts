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

  // CSV Import fields
  @Expose()
  email2?: string;

  @Expose()
  phone2?: string;

  @Expose()
  fax?: string;

  @Expose()
  address?: string;

  @Expose()
  address2?: string;

  @Expose()
  zip?: string;

  @Expose()
  city?: string;

  @Expose()
  state?: string;

  @Expose()
  country?: string;

  @Expose()
  firstName?: string;

  @Expose()
  lastName?: string;

  // CSV Import tracking flags
  @Expose()
  isImportedFromCsv?: boolean;

  @Expose()
  isProfileComplete?: boolean;

  @Expose()
  missingRequiredFields?: string[];

  @Expose()
  csvOptionalFields?: Record<string, any>;

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
