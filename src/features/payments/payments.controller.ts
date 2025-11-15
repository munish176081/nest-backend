import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreateStripeIntentDto,
  ConfirmStripePaymentDto,
  CreatePayPalOrderDto,
  CapturePayPalPaymentDto,
} from './dto';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(LoggedInGuard)
  @Post('stripe/create-intent')
  @HttpCode(HttpStatus.OK)
  async createStripeIntent(
    @Req() req: Request,
    @Body() createIntentDto: CreateStripeIntentDto,
  ) {
    // Comprehensive validation - use validatedUserId from guard if available
    const userId = (req as any).validatedUserId || req.user?.id;
    
    if (!req.user) {
      console.error('Payment error: req.user is missing');
      throw new UnauthorizedException('User session not found. Please log in again.');
    }
    
    const userIdString = String(userId || '').trim();
    if (!userId || userId === null || userId === undefined || userId === 'null' || userId === 'undefined' || userIdString === '') {
      console.error('Payment error: req.user.id is invalid', {
        hasUser: !!req.user,
        userId: userId,
        validatedUserId: (req as any).validatedUserId,
        userIdType: typeof userId,
        userIdString: userIdString,
        userEmail: req.user?.email,
        userObject: JSON.stringify(req.user),
      });
      throw new UnauthorizedException('User ID is missing or invalid. Please log in again.');
    }
    
    console.log('Creating Stripe payment intent for user:', userId, 'validatedUserId:', (req as any).validatedUserId);
    
    const clientSecret = await this.paymentsService.createStripePaymentIntent(
      createIntentDto.amount,
      createIntentDto.listingType,
      userId,
      createIntentDto.listingId,
    );
    return clientSecret;
  }

  @UseGuards(LoggedInGuard)
  @Post('stripe/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmStripePayment(
    @Req() req: Request,
    @Body() confirmPaymentDto: ConfirmStripePaymentDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }
    
    return await this.paymentsService.confirmStripePayment(
      confirmPaymentDto.paymentIntentId,
      confirmPaymentDto.paymentMethodId,
      req.user.id,
    );
  }

  @UseGuards(LoggedInGuard)
  @Post('paypal/create-order')
  @HttpCode(HttpStatus.OK)
  async createPayPalOrder(
    @Req() req: Request,
    @Body() createOrderDto: CreatePayPalOrderDto,
  ) {
    if (!req.user || !req.user.id) {
      console.error('Payment error: req.user or req.user.id is missing', {
        hasUser: !!req.user,
        userId: req.user?.id,
        userEmail: req.user?.email,
      });
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }
    
    console.log('Creating PayPal order for user:', req.user.id);
    
    const orderId = await this.paymentsService.createPayPalOrder(
      createOrderDto.amount,
      createOrderDto.listingType,
      req.user.id,
      createOrderDto.listingId,
    );
    return orderId;
  }

  @UseGuards(LoggedInGuard)
  @Post('paypal/capture')
  @HttpCode(HttpStatus.OK)
  async capturePayPalPayment(
    @Req() req: Request,
    @Body() capturePaymentDto: CapturePayPalPaymentDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User ID is missing. Please log in again.');
    }
    
    return await this.paymentsService.capturePayPalPayment(
      capturePaymentDto.orderId,
      req.user.id,
    );
  }
}

