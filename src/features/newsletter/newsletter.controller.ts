import { Body, Controller, Post } from "@nestjs/common";
import { NewsletterService } from "./newsletter.service";
import { SubscribeDto } from "./dto/subscribe.dto";

@Controller("newsletter")
export class NewsletterController {
  constructor(private newsletter: NewsletterService) {}

  @Post('subscribe')
    async subscribe(@Body() dto: SubscribeDto) {
    const { name, email } = dto;
    const result = await this.newsletter.subscribe(name, email);
    return result;
    }
}
