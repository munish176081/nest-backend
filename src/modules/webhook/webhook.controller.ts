import { Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Request } from 'express';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('stripe')
  handleStripeWebhook(@Req() req: RawBodyRequest<Request>) {
    return this.webhookService.handleStripeWebhook(req);
  }
}
