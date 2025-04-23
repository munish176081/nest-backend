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

      // returning true here to prevent the request from being blocked and we can catch it
      return true;
    }
  }
}
