import { Module } from '@nestjs/common';
import { RecaptchaService } from './services/recaptcha.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [RecaptchaService],
  exports: [RecaptchaService],
})
export class CommonModule {}