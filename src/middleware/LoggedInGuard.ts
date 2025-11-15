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

    if (!req.isAuthenticated() || !req.user) {
      // Try to get user from session directly as fallback
      const sessionUser = req.session?.passport?.user || req.session?.user;
      if (sessionUser && sessionUser.id) {
        req.user = sessionUser;
      } else {
        console.error('User not authenticated:', {
          isAuthenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          hasSessionUser: !!sessionUser,
          sessionKeys: req.session ? Object.keys(req.session) : [],
        });
        throw new UnauthorizedException('You are not logged in');
      }
    }

    // Ensure req.user has an id property - try multiple sources
    let userId = req.user.id;
    if (!userId) {
      userId = (req.session?.passport?.user as any)?.id || (req.session?.user as any)?.id;
      if (userId) {
        req.user.id = userId;
      }
    }

    if (!userId || userId === null || userId === undefined || userId === 'null' || userId === 'undefined' || String(userId).trim() === '') {
      console.error('User session missing id property:', {
        reqUser: req.user,
        sessionPassportUser: req.session?.passport?.user,
        sessionUser: req.session?.user,
        userId,
      });
      throw new UnauthorizedException('Invalid user session. Please log in again.');
    }

    // Fetch fresh user data from the database
    try {
      if (!req.user.email) {
        throw new Error('User email is missing');
      }

      const freshUser = await this.usersService.validateAndGetUser(req.user.email);
      
      // Ensure freshUser has an id
      if (!freshUser || !freshUser.id) {
        console.error('Fresh user data is invalid:', { freshUser });
        throw new Error('User data is invalid');
      }
      
      // Update the session with fresh user data
      await this.sessionService.refreshUserSession(freshUser.id, freshUser);
      
      // Update req.user with fresh data - ensure id is set
      req.user = {
        id: freshUser.id,
        email: freshUser.email,
        name: freshUser.name,
        username: freshUser.username,
        status: freshUser.status,
        imageUrl: freshUser.imageUrl,
        createdAt: freshUser.createdAt,
        role: freshUser.role,
        isSuperAdmin: freshUser.isSuperAdmin,
      };

      // Also update session directly
      if (req.session?.passport) {
        req.session.passport.user = req.user;
      }
      if (req.session) {
        req.session.user = req.user;
      }
    } catch (error) {
      console.error('Error refreshing user session:', error);
      // If we can't fetch fresh data, verify existing session has id
      const existingUserId = req.user.id || (req.session?.passport?.user as any)?.id || (req.session?.user as any)?.id;
      if (!existingUserId || existingUserId === null || existingUserId === undefined) {
        console.error('No valid userId found after session refresh error:', {
          reqUserId: req.user.id,
          sessionPassportUserId: (req.session?.passport?.user as any)?.id,
          sessionUserId: (req.session?.user as any)?.id,
        });
        throw new UnauthorizedException('User session is invalid. Please log in again.');
      }
      // Ensure req.user.id is set from existing session
      if (!req.user.id && existingUserId) {
        req.user.id = existingUserId;
      }
    }

    // Final check: ensure req.user.id exists and is valid before allowing access
    const finalUserId = req.user.id;
    if (!finalUserId || finalUserId === null || finalUserId === undefined || finalUserId === 'null' || finalUserId === 'undefined' || String(finalUserId).trim() === '') {
      console.error('LoggedInGuard: Final check failed - invalid userId', {
        userId: finalUserId,
        userIdType: typeof finalUserId,
        userEmail: req.user.email,
        userObject: JSON.stringify(req.user),
      });
      throw new UnauthorizedException('User ID is missing or invalid. Please log in again.');
    }

    // Store validated userId in request for easy access
    (req as any).validatedUserId = finalUserId;

    if (req.user.status === 'suspended')
      throw new UnauthorizedException('Your account is suspended');

    return true;
  }
}
