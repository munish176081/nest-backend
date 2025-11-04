import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { GmailService } from './gmail.service';
import { GmailAuthController } from './gmail-auth.controller';

@Module({
  controllers: [GmailAuthController],
  providers: [EmailService, GmailService],
  exports: [EmailService],
})
export class EmailModule {}
