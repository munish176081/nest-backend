"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const dto_1 = require("./dto");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async createStripeIntent(req, createIntentDto) {
        const userId = req.validatedUserId || req.user?.id;
        if (!req.user) {
            console.error('Payment error: req.user is missing');
            throw new common_1.UnauthorizedException('User session not found. Please log in again.');
        }
        const userIdString = String(userId || '').trim();
        if (!userId || userId === null || userId === undefined || userId === 'null' || userId === 'undefined' || userIdString === '') {
            console.error('Payment error: req.user.id is invalid', {
                hasUser: !!req.user,
                userId: userId,
                validatedUserId: req.validatedUserId,
                userIdType: typeof userId,
                userIdString: userIdString,
                userEmail: req.user?.email,
                userObject: JSON.stringify(req.user),
            });
            throw new common_1.UnauthorizedException('User ID is missing or invalid. Please log in again.');
        }
        console.log('Creating Stripe payment intent for user:', userId, 'validatedUserId:', req.validatedUserId);
        const clientSecret = await this.paymentsService.createStripePaymentIntent(createIntentDto.amount, createIntentDto.listingType, userId, createIntentDto.listingId);
        return clientSecret;
    }
    async confirmStripePayment(req, confirmPaymentDto) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.paymentsService.confirmStripePayment(confirmPaymentDto.paymentIntentId, confirmPaymentDto.paymentMethodId, req.user.id);
    }
    async createPayPalOrder(req, createOrderDto) {
        if (!req.user || !req.user.id) {
            console.error('Payment error: req.user or req.user.id is missing', {
                hasUser: !!req.user,
                userId: req.user?.id,
                userEmail: req.user?.email,
            });
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        console.log('💰 [PayPal] Controller: Creating PayPal order for user:', req.user.id);
        const orderId = await this.paymentsService.createPayPalOrder(createOrderDto.amount, createOrderDto.listingType, req.user.id, createOrderDto.listingId);
        return orderId;
    }
    async capturePayPalPayment(req, capturePaymentDto) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.paymentsService.capturePayPalPayment(capturePaymentDto.orderId, req.user.id);
    }
    async getUserPayments(req, res, sync) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        console.log('📊 [Payments] Fetching payments for user:', req.user.id);
        const payments = sync === 'true'
            ? await this.paymentsService.getUserPaymentsWithStripeSync(req.user.id)
            : await this.paymentsService.getUserPayments(req.user.id);
        console.log('📊 [Payments] Found', payments.length, 'payments');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.json(payments);
    }
    async getPaymentById(req, id) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.paymentsService.getPaymentById(id, req.user.id);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)('stripe/create-intent'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateStripeIntentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createStripeIntent", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)('stripe/confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ConfirmStripePaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "confirmStripePayment", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)('paypal/create-order'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreatePayPalOrderDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createPayPalOrder", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)('paypal/capture'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CapturePayPalPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "capturePayPalPayment", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('sync')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getUserPayments", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPaymentById", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map