import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../authentication.service';
import { parseIpFromReq } from 'src/helpers/parseIpFromReq';
import { createUserTokenData } from 'src/helpers/createUserTokenData';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.get('google.clientId'),
      clientSecret: configService.get('google.clientSecret'),
      callbackURL: `${configService.get('apiUrl')}/api/v1/auth/google/callback`,
      scope: ['profile', 'email'],
      state: true,
      passReqToCallback: true,
    });
    console.log(configService.get('google.clientId'))
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile._json.email;

    if (!email || !profile._json.email_verified) {
      done(null, false, { message: 'Email not verified' });
      return;
    }

    try {
      const account = await this.authService.createOrGetAccount({
        externalId: profile.id,
        provider: 'google',
        userData: {
          email,
          imageUrl: profile._json.picture,
          ip: parseIpFromReq(req),
          firstName: profile._json.given_name,
          lastName: profile._json.family_name,
        },
        raw: profile._json,
      });

      done(null, createUserTokenData(account.user));
    } catch (err) {
      let message = 'Something went wrong';

      if (err.status?.toString()?.startsWith('4') && err.message) {
        message = err.message;
      }

      done(null, false, { message });
    }
  }
}
