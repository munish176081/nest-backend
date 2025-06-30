import { Injectable } from '@nestjs/common';
import { Profile, Strategy } from 'passport-facebook';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../authentication.service';
import { createUserTokenData } from 'src/helpers/createUserTokenData';
import { parseIpFromReq } from 'src/helpers/parseIpFromReq';

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
      profileFields:['id', 'email', 'gender', 'link' , 'verified']
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
    const email = profile._json.email;
    console.log(email)
    if (!email) {
      done(null, false, { message: 'Email not verified' });
      return;
    }

    try {
      const account = await this.authService.createOrGetAccount({
        externalId: profile.id,
        provider: 'facebook',
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
