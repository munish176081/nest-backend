import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class LoggedInGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest() as Request;

    if (!req.isAuthenticated() || !req.user)
      throw new UnauthorizedException('You are not logged in');

    if (req.user.status === 'suspended')
      throw new UnauthorizedException('Your account is suspended');

    return true;
  }
}
