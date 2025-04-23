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
import { UserDto } from 'src/modules/users/dto/user.dto';
import { AuthService } from './auth.service';
import { parseIpFromReq } from 'src/utils/parseIpFromReq';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { LoggedInGuard } from 'src/guards/LoggedInGuard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  handleGoogleLogin() {}

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
  handleFacebookLogin() {}

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
  handleSignup(@Req() req: Request, @Body() signupBody: SignupDto) {
    const ip = parseIpFromReq(req);

    return this.authService.signUp(signupBody, ip);
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
          'If an account with that email exists, you will receive a password reset email shortly.',
      };
    } catch (error) {
      console.log(
        `Failed to reset password for email ${forgotPasswordBody.email} error: ${error}`,
      );

      throw new InternalServerErrorException(
        'Failed to reset password! Please make sure you entered a valid email and have a password setup.',
      );
    }
  }

  @Patch('reset-password')
  async resetPassword(
    @Body() resetPasswordBody: ResetPasswordDto,
    @Req() req: Request,
  ) {
    if (req.isAuthenticated()) {
      throw new BadRequestException('You are already authenticated');
    }

    return this.authService.resetPassword(resetPasswordBody);
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
