import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

const CustomAuthGuard = (type?: string | string[]) => {
  return class Auth extends AuthGuard(type) {
    handleRequest<TUser = any>(
      err: any,
      user: any,
      info: any,
      context: ExecutionContext,
    ): TUser {
      if (err) {
        throw err;
      }

      if (!user) {
        if (info) {
          const msg = info.message || info;

          const req = context.switchToHttp().getRequest() as Request;

          req.session.messages = req.session.messages || [];

          if (!req.session.messages.includes(msg))
            req.session.messages.push(msg);
        }

        throw new UnauthorizedException();
      }

      return user;
    }
  };
};

export { CustomAuthGuard as AuthGuard };
