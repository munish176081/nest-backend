import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor() {
    super();
  }

  serializeUser(user: any, done) {
    done(null, user);
  }

  deserializeUser(payload: any, done) {
    done(null, payload);
  }
}
