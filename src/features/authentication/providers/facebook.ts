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
      profileFields: ['id', 'email', 'gender', 'link', 'verified', 'name', 'first_name', 'last_name', 'picture'],
      timeout: configService.get('oauthTimeout') || 30000,
      proxy: false,
    });
    console.log('Facebook OAuth configured with client ID:', configService.get('facebook.clientId') ? 'configured' : 'not configured');
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: any,
  ) {
    const email = profile._json.email;
    
    if (!email) {
      done(null, false, { message: 'Email not connected to Facebook' });
      return;
    }

    try {
      console.log('Facebook profile:', {
        id: profile.id,
        email: profile._json.email,
        name: profile._json.name,
        first_name: profile._json.first_name,
        last_name: profile._json.last_name,
        given_name: profile._json.given_name,
        family_name: profile._json.family_name,
        picture: profile._json.picture,
        picture_data: profile._json.picture?.data,
      });

      // Facebook might provide name fields in different formats
      const firstName = profile._json.first_name || profile._json.given_name || '';
      const lastName = profile._json.last_name || profile._json.family_name || '';
      const imageUrl = profile._json.picture?.data?.url || profile._json.picture;

      const account = await this.authService.createOrGetAccount({
        externalId: profile.id,
        provider: 'facebook',
        userData: {
          email,
          imageUrl,
          ip: parseIpFromReq(req),
          firstName,
          lastName,
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
