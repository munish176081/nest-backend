import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Injectable()
export class FacebookOAuthGuard extends AuthGuard('facebook') {
  async canActivate(context: ExecutionContext) {
    try {
      const activate = (await super.canActivate(context)) as boolean;
      const request = context.switchToHttp().getRequest();
      await super.logIn(request);
      return activate;
    } catch (err) {
      console.error(`Failed to login with facebook. err:`, err);
      console.error(`Error stack:`, err.stack);
      
      // Handle specific timeout errors
      if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        console.error('Facebook OAuth timeout error:', err.message);
        const response = context.switchToHttp().getResponse();
        response.redirect('/api/v1/auth/error?reason=Facebook+OAuth+timeout.+Please+try+again.');
        return false;
      }

      // Handle other network errors
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        console.error('Facebook OAuth network error:', err.message);
        const response = context.switchToHttp().getResponse();
        response.redirect('/api/v1/auth/error?reason=Network+error.+Please+check+your+connection+and+try+again.');
        return false;
      }

      // Check if there are any session messages that might indicate the specific issue
      const request = context.switchToHttp().getRequest();
      if (request.session?.messages?.length > 0) {
        console.error('Session messages:', request.session.messages);
      }

      // Redirect to error page with specific error message
      const response = context.switchToHttp().getResponse();
      const errorMessage = request.session?.messages?.length > 0 
        ? request.session.messages[request.session.messages.length - 1] 
        : 'Facebook OAuth authentication failed';
      
      response.redirect(`/api/v1/auth/error?reason=${encodeURIComponent(errorMessage)}`);
      return false;
    }
  }
}
