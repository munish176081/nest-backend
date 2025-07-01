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
      clientID: configService.getOrThrow<string>('facebook.clientId'),
      clientSecret: configService.getOrThrow<string>('facebook.clientSecret'),
      callbackURL: `${configService.getOrThrow<string>('apiUrl')}/api/v1/auth/facebook/callback`,
      scope: ['email', 'public_profile'],
      state: true,
      passReqToCallback: true,
      profileFields: ['id', 'emails', 'gender', 'link', 'verified', 'name', 'picture'],
      timeout: parseInt(configService.get('oauthTimeout') || '30000', 10),
      proxy: false,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: any, info?: any) => void,
  ) {
    try {
      // Validate email presence
      const email = this.getEmailFromProfile(profile);
      if (!email) {
        return done(null, false, { message: 'No verified email associated with Facebook account' });
      }

      // Parse name components safely
      const { firstName, lastName } = this.parseName(profile);
      const imageUrl = this.getProfileImage(profile);

      // Create or retrieve account
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

      return done(null, createUserTokenData(account.user));
    } catch (error) {
      this.handleValidationError(error, done);
    }
  }

  private getEmailFromProfile(profile: Profile): string | null {
    return (
      profile?.emails?.[0]?.value || 
      profile?._json?.email || 
      null
    );
  }

  private parseName(profile: Profile): { firstName: string; lastName: string } {
    const nameParts = (profile?.displayName || profile?._json?.name || '').trim().split(/\s+/);
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
    };
  }

  private getProfileImage(profile: Profile): string | undefined {
    return (
      profile?._json?.picture?.data?.url ||
      profile?.photos?.[0]?.value ||
      undefined
    );
  }

  private handleValidationError(
    error: any,
    done: (error: Error | null, user?: any, info?: any) => void,
  ) {
    const errorMessage = error.response?.data?.message || error.message;
    
    if (error.status?.toString()?.startsWith('4')) {
      // Client-side errors (4xx)
      return done(null, false, {
        message: errorMessage || 'Authentication rejected due to invalid data',
      });
    } else {
      // Server-side errors (5xx)
      console.error('Facebook auth error:', error);
      return done(null, false, {
        message: errorMessage || 'Temporary authentication service disruption',
      });
    }
  }
}
