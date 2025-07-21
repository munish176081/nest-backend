import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SignupDto } from './dto/signup.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

import { LoggedInGuard } from 'src/middleware/LoggedInGuard';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';
import { AuthService } from './authentication.service';
import { UserDto } from '../accounts/dto/user.dto';
import { Serialize } from 'src/transformers/serialize.interceptor';
import { parseIpFromReq } from 'src/helpers/parseIpFromReq';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) { }

  @Get('google/config')
  handleGoogleConfig() {
    return {
      clientId: this.configService.get('google.clientId') ? 'configured' : 'not configured',
      clientSecret: this.configService.get('google.clientSecret') ? 'configured' : 'not configured',
      callbackURL: `${this.configService.get('apiUrl')}/api/v1/auth/google/callback`,
      apiUrl: this.configService.get('apiUrl'),
    };
  }

  @Get('facebook/config')
  handleFacebookConfig() {
    return {
      clientId: this.configService.get('facebook.clientId') ? 'configured' : 'not configured',
      clientSecret: this.configService.get('facebook.clientSecret') ? 'configured' : 'not configured',
      callbackURL: `${this.configService.get('apiUrl')}/api/v1/auth/facebook/callback`,
      apiUrl: this.configService.get('apiUrl'),
      oauthTimeout: this.configService.get('oauthTimeout'),
    };
  }

  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  handleGoogleLogin() { }

  @Get('error')
  handleAuthError(@Req() req: Request, @Res() res: Response) {
    const messages = req.session?.messages || [];
    const errorMessage = messages.length > 0 ? messages[messages.length - 1] : 'Authentication failed';
    
    // Clear session messages
    if (req.session?.messages) {
      req.session.messages = [];
    }
    
    const siteUrl = this.configService.get('siteUrl');
    res.redirect(`${siteUrl}/auth/sign-in-error?error=${encodeURIComponent(errorMessage)}`);
  }

  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  handleGoogleCallback(@Req() req: Request, @Res() res: Response) {
    // can happen because we are returning from guard GoogleOAuthGuard if there is custom error so that can catch here
    if (!req.isAuthenticated()) {
      res.redirect('/api/v1/auth/error');
      return;
    }

    const siteUrl = this.configService.get('siteUrl');

    const url = req.session.returnTo || siteUrl;

    res.redirect(url);
  }

  @UseGuards(FacebookOAuthGuard)
  @Get('facebook')
  handleFacebookLogin() { }

  @UseGuards(FacebookOAuthGuard)
  @Get('facebook/callback')
  handleFacebookCallback(@Req() req: Request, @Res() res: Response) {
    // can happen because we are returning from guard GoogleOAuthGuard if there is custom error so that can catch here
    if (!req.isAuthenticated()) {
      res.redirect('/api/v1/auth/error');
      return;
    }

    const siteUrl = this.configService.get('siteUrl');

    const url = req.session.returnTo || siteUrl;

    res.redirect(url);
  }

  @Serialize(UserDto)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleLogin(@Req() req: Request) {
    // can happen because we are returning from guard GoogleOAuthGuard if there is custom error so that can catch here
    if (!req.isAuthenticated()) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return req.user;
  }

  @Serialize(UserDto)
  @Post('sign-up')
  async handleSignup(@Req() req: Request, @Body() signupBody: SignupDto) {
    const ip = parseIpFromReq(req);
    const user = await this.authService.signUp(signupBody, ip);

    // Log the user in after signup
    return new Promise((resolve, reject) => {
      req.login(user, (err) => {
        if (err) {
          return reject(new InternalServerErrorException('Login after signup failed'));
        }
        resolve(user);
      });
    });
  }

  @UseGuards(LoggedInGuard)
  @Post('request-verify-email-code')
  requestEmailVerify(@Req() req: Request) {
    if (!req.user.email) {
      throw new BadRequestException('No associated email found');
    }

    return this.authService.requestEmailVerify(req.user.email);
  }

  @Get('verify-email')
  async verifyEmail(
    @Query() verifyEmailBody: VerifyEmailDto,
    @Res() res: Response,
  ) {
    await this.authService.verifyEmail(verifyEmailBody);

    // TODO! update user in session

    res.redirect(
      `${this.configService.get('siteUrl')}/auth/verify-email-success`,
    );
  }

  @Post('verify-email-otp')
  async verifyEmailOtp(@Body() verifyEmailOtpBody: VerifyEmailOtpDto) {
    console.log(verifyEmailOtpBody);
    if (verifyEmailOtpBody.userLoggedIn) {
      return await this.authService.verifyEmailOtp(verifyEmailOtpBody);
    } else {
      return await this.authService.resetEmailOtp(verifyEmailOtpBody);
    }
  }

  @Post('forgot-password')
  async forgotPassword(
    @Req() req: Request,
    @Body() forgotPasswordBody: ForgotPasswordDto,
  ) {
    if (req.isAuthenticated()) {
      throw new BadRequestException('You are already authenticated');
    }

    try {
      await this.authService.forgotPassword(forgotPasswordBody);
      return {
        message:
          'If an account with that email exists, you will receive a password reset code shortly.',
      };
    } catch (error) {
      console.log(
        `Failed to reset password for email ${forgotPasswordBody.email} error: ${error}`,
      );

      // Check if it's a known error with a specific message
      if (error?.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }

      // Check if it's a validation error
      if (error?.status === 400) {
        throw new BadRequestException(error.message || 'Invalid request data');
      }

      // If the error has a message, return it
      if (error?.message) {
        throw new InternalServerErrorException(error.message);
      }

      // For other errors, throw a generic message
      throw new InternalServerErrorException(
        'Failed to reset password! Please make sure you entered a valid email and have a password setup.',
      );
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordBody: ResetPasswordDto,
    @Req() req: Request,
  ) {
    if (req.isAuthenticated()) {
      throw new BadRequestException('You are already authenticated');
    }

    return this.authService.resetPassword(resetPasswordBody);
  }

  @Patch('reset-password-otp')
  async resetPasswordOtp(
    @Body() resetPasswordOtpBody: ResetPasswordOtpDto,
    @Req() req: Request,
  ) {
    if (req.isAuthenticated()) {
      throw new BadRequestException('You are already authenticated');
    }

    return this.authService.resetPasswordOtp(resetPasswordOtpBody);
  }

  @Get('error')
  async errorRedirect(@Req() req: Request, @Res() res: Response) {
    const message = req.session.messages?.[0];

    // TODO: redirect to proper front-end route based on error
    res.redirect(
      `${this.configService.get('siteUrl')}/auth/sign-in-error${message ? `?reason=${JSON.stringify(message)}` : ''}`,
    );
  }

  @Post('sign-out')
  async handleLogout(@Req() req: Request, @Res() res: Response) {
    req.logOut((err) => {
      if (err) {
        throw new InternalServerErrorException('Failed to log out.');
      }

      res.clearCookie('token');

      res.status(201).json(null);
    });
  }
}
