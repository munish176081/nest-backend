import { Module } from "@nestjs/common";
import { NewsletterController } from "./newsletter.controller";
import { NewsletterService } from "./newsletter.service";
import { MailchimpClient } from "./mailchimp.client";

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService, MailchimpClient],
})
export class NewsletterModule {}
