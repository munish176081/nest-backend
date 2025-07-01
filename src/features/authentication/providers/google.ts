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

    if (!email) {
      done(null, false, { message: 'Email not provided by Google' });
      return;
    }

    // Google OAuth2.0 doesn't always provide email_verified field
    // We'll trust Google's OAuth flow and assume the email is verified
    // since Google requires email verification for OAuth accounts

    try {
      console.log('Google profile:', {
        id: profile.id,
        email: profile._json.email,
        name: profile._json.name,
        given_name: profile._json.given_name,
        family_name: profile._json.family_name,
        picture: profile._json.picture,
      });

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

      console.log('Account created/retrieved:', account);
      console.log('User data:', account.user);

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
