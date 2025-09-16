import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext) {
    const activate = (await super.canActivate(context)) as boolean;
    
    if (!activate) {
      return false;
    }
    
    const request = context.switchToHttp().getRequest();
    await super.logIn(request);
    return true;
  }
}
