import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext) {
    try {
      const activate = (await super.canActivate(context)) as boolean;
      const request = context.switchToHttp().getRequest();
      await super.logIn(request);
      return activate;
    } catch (err) {
      console.error(`Failed to login with google. err:`, err);
      console.error(`Error stack:`, err.stack);

      // Check if there are any session messages that might indicate the specific issue
      const request = context.switchToHttp().getRequest();
      if (request.session?.messages?.length > 0) {
        console.error('Session messages:', request.session.messages);
      }

      // Redirect to error page with specific error message
      const response = context.switchToHttp().getResponse();
      const errorMessage = request.session?.messages?.length > 0 
        ? request.session.messages[request.session.messages.length - 1] 
        : 'Google OAuth authentication failed';
      
      response.redirect(`/api/v1/auth/error?reason=${encodeURIComponent(errorMessage)}`);
      return false;
    }
  }
}
