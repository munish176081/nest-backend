import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { isAllowedUrlToReturn } from './utils/is-valid-url-to-return';

@Injectable()
export class PrepareLoginMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction) {
    req.logOut(() => {
      if (req.headers.referer && isAllowedUrlToReturn(req.headers.referer)) {
        req.session.returnTo = req.headers.referer;
      }

      next();
    });
  }
}
