import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest() as Request;

    if (!req.isAuthenticated() || !req.user) {
      throw new UnauthorizedException('You are not logged in');
    }

    // Check if user has admin or super admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && !req.user.isSuperAdmin) {
      throw new UnauthorizedException('You do not have admin privileges');
    }

    return true;
  }
}
