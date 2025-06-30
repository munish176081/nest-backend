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
      console.log(`Failed to login with facebook. err: ${err}`);
      
      // Handle specific timeout errors
      if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        console.error('Facebook OAuth timeout error:', err.message);
        // You could redirect to an error page with a specific message
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

      // returning true here to prevent the request from being blocked and we can catch it
      return true;
    }
  }
}
