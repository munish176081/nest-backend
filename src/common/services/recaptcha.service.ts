import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly configService: ConfigService) {}

  async verifyRecaptcha(token: string): Promise<boolean> {
    const secretKey =
      this.configService.get<string>('recaptcha.secretKey') ||
      this.configService.get<string>('RECAPTCHA_SECRET_KEY');

    if (!secretKey) {
      this.logger.warn('reCAPTCHA secret key not configured. Skipping verification.');
      return true; // Allow if not configured
    }

    if (!token) {
      throw new BadRequestException('reCAPTCHA token is required');
    }

    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${secretKey}&response=${token}`,
        },
      );

      const data = await response.json();

      if (!data.success) {
        this.logger.warn('reCAPTCHA verification failed:', data);
        throw new BadRequestException('reCAPTCHA verification failed. Please try again.');
      }

      return true;
    } catch (error) {
      this.logger.error('Error verifying reCAPTCHA:', error);
      throw new BadRequestException('Failed to verify reCAPTCHA. Please try again.');
    }
  }
}