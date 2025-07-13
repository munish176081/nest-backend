import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '../../accounts/entities/account.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoleEnum[]) => SetMetadata(ROLES_KEY, roles); 