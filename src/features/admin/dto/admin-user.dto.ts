import { Expose } from 'class-transformer';
import { UserStatusEnum, UserRoleEnum } from '../../accounts/entities/account.entity';

export class AdminUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  username: string;

  @Expose()
  status: UserStatusEnum;

  @Expose()
  role: UserRoleEnum;

  @Expose()
  isSuperAdmin: boolean;

  @Expose()
  imageUrl: string;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;

  @Expose()
  externalAccounts: any[];
}

export class UpdateUserStatusDto {
  status: UserStatusEnum;
}

export class UpdateUserRoleDto {
  role: UserRoleEnum;
}

export class UserSearchDto {
  query: string;
  page?: number;
  limit?: number;
}

export class UserListDto {
  @Expose()
  users: AdminUserDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
}

// Alternative approach: Create a simpler DTO without nested objects
export class SimpleUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  username: string;

  @Expose()
  status: UserStatusEnum;

  @Expose()
  role: UserRoleEnum;

  @Expose()
  createdAt: string;
}

export class SimpleUserListDto {
  @Expose()
  users: SimpleUserDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
} 