import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest() as Request;

    if (!req.isAuthenticated() || !req.user) {
      throw new UnauthorizedException('You are not logged in');
    }

    // Check if user is super admin
    if (!req.user?.isSuperAdmin && req.user?.role !== 'super_admin') {
      throw new UnauthorizedException('Super admin access required');
    }

    return true;
  }
} 