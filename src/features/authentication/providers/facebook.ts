import { Injectable } from '@nestjs/common';
import { Profile, Strategy } from 'passport-facebook';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../authentication.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.get('facebook.clientId'),
      clientSecret: configService.get('facebook.clientSecret'),
      callbackURL: `${configService.get('apiUrl')}/api/v1/auth/facebook/callback`,
      scope: ['email', 'public_profile'],
      state: true,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: any,
  ) {
    // TODO: handle profile creation
    done('Not implemented');

    try {
    } catch (err) {
      let message = 'Something went wrong';

      if (err.status?.toString()?.startsWith('4') && err.message) {
        message = err.message;
      }

      done(null, false, { message });
    }
  }
}
