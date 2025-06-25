import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from 'src/features/accounts/users.service';
import { SessionService } from 'src/features/authentication/session.service';

@Injectable()
export class LoggedInGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest() as Request;

    if (!req.isAuthenticated() || !req.user)
      throw new UnauthorizedException('You are not logged in');

    // Fetch fresh user data from the database
    try {
      const freshUser = await this.usersService.validateAndGetUser(req.user.email);
      
      // Update the session with fresh user data
      await this.sessionService.refreshUserSession(freshUser.id, freshUser);
      
      // Update req.user with fresh data
      req.user = {
        id: freshUser.id,
        email: freshUser.email,
        username: freshUser.username,
        status: freshUser.status,
        imageUrl: freshUser.imageUrl,
        createdAt: freshUser.createdAt,
      };
    } catch (error) {
      console.error('Error refreshing user session:', error);
      // If we can't fetch fresh data, continue with existing session data
    }

    if (req.user.status === 'suspended')
      throw new UnauthorizedException('Your account is suspended');

    return true;
  }
}
