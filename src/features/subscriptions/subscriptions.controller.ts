import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import {
  CreateStripeSubscriptionDto,
  CreatePayPalSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  UpdatePaymentMethodDto,
} from './dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(LoggedInGuard)
  @Post('stripe/create')
  @HttpCode(HttpStatus.OK)
  async createStripeSubscription(
    @Req() req: Request,
    @Body() createDto: CreateStripeSubscriptionDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    return await this.subscriptionsService.createStripeSubscription(
      req.user.id,
      createDto.listingType,
      createDto.paymentMethodId, // Optional - can be undefined for PUPPY_LITTER_LISTING
      createDto.listingId,
      createDto.includesFeatured || false,
    );
  }

  @UseGuards(LoggedInGuard)
  @Post('paypal/create')
  @HttpCode(HttpStatus.OK)
  async createPayPalSubscription(
    @Req() req: Request,
    @Body() createDto: CreatePayPalSubscriptionDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    return await this.subscriptionsService.createPayPalSubscription(
      req.user.id,
      createDto.listingType,
      createDto.listingId,
      createDto.includesFeatured || false,
    );
  }

  @UseGuards(LoggedInGuard)
  @Get()
  async getUserSubscriptions(
    @Req() req: Request,
    @Query('sync') sync?: string,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    const syncFromStripe = sync === 'true' || sync === '1';
    return await this.subscriptionsService.getUserSubscriptions(
      req.user.id,
      syncFromStripe,
    );
  }

  @UseGuards(LoggedInGuard)
  @Get('check/:listingType')
  async checkActiveSubscription(
    @Req() req: Request,
    @Param('listingType') listingType: string,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    return await this.subscriptionsService.hasActiveSubscriptionForListingType(
      req.user.id,
      listingType,
    );
  }

  @UseGuards(LoggedInGuard)
  @Get(':id')
  async getSubscriptionById(@Req() req: Request, @Param('id') id: string) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    return await this.subscriptionsService.getSubscriptionById(id, req.user.id);
  }

  @UseGuards(LoggedInGuard)
  @Post(':id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  async confirmSubscriptionPayment(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    return await this.subscriptionsService.confirmSubscriptionPayment(id, req.user.id);
  }

  @UseGuards(LoggedInGuard)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() cancelDto: CancelSubscriptionDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    return await this.subscriptionsService.cancelSubscription(
      id,
      req.user.id,
      cancelDto.cancelAtPeriodEnd !== undefined ? cancelDto.cancelAtPeriodEnd : true,
    );
  }

  @UseGuards(LoggedInGuard)
  @Post(':id/update')
  @HttpCode(HttpStatus.OK)
  async updateSubscription(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    if (updateDto.includesFeatured === undefined) {
      throw new BadRequestException('includesFeatured is required');
    }

    return await this.subscriptionsService.updateSubscription(
      id,
      req.user.id,
      updateDto.includesFeatured,
    );
  }

  @UseGuards(LoggedInGuard)
  @Get(':id/payment-method')
  async getPaymentMethod(@Req() req: Request, @Param('id') id: string) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    const subscription = await this.subscriptionsService.getSubscriptionById(
      id,
      req.user.id,
    );

    return {
      paymentMethod: subscription.paymentMethod,
      paymentMethodId: subscription.metadata?.paymentMethodId,
      customerId: subscription.metadata?.customerId,
    };
  }

  @UseGuards(LoggedInGuard)
  @Post(':id/payment-method')
  @HttpCode(HttpStatus.OK)
  async updatePaymentMethod(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentMethodDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    return await this.subscriptionsService.updatePaymentMethod(
      id,
      req.user.id,
      updateDto.paymentMethodId,
    );
  }

  @UseGuards(LoggedInGuard)
  @Post(':id/sync-paypal')
  @HttpCode(HttpStatus.OK)
  async syncPayPalSubscription(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }

    return await this.subscriptionsService.syncPayPalSubscriptionStatus(
      id,
      req.user.id,
    );
  }
}

