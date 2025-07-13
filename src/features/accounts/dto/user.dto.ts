import { Expose } from 'class-transformer';

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
  createdAt: string;

  @Expose()
  status: string;

  // Role-related fields
  @Expose()
  role: string;

  @Expose()
  isSuperAdmin: boolean;

  @Expose()
  permissions: Record<string, any>;

  @Expose()
  get displayName(): string {
    return this.name || this.username || 'User';
  }
}
