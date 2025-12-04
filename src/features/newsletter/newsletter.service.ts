import { Injectable } from "@nestjs/common";
import { MailchimpClient } from "./mailchimp.client";

@Injectable()
export class NewsletterService {
  constructor(private mailchimp: MailchimpClient) {}

  async subscribe(name: string, email: string) {
    const response = await this.mailchimp.addMember(name, email);
    return response;
  }
}