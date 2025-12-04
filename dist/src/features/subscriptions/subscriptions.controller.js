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
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_service_1 = require("./subscriptions.service");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const dto_1 = require("./dto");
let SubscriptionsController = class SubscriptionsController {
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async createStripeSubscription(req, createDto) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.subscriptionsService.createStripeSubscription(req.user.id, createDto.listingType, createDto.paymentMethodId, createDto.listingId, createDto.includesFeatured || false);
    }
    async createPayPalSubscription(req, createDto) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.subscriptionsService.createPayPalSubscription(req.user.id, createDto.listingType, createDto.listingId, createDto.includesFeatured || false);
    }
    async getUserSubscriptions(req, sync) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        const syncFromStripe = sync === 'true' || sync === '1';
        return await this.subscriptionsService.getUserSubscriptions(req.user.id, syncFromStripe);
    }
    async checkActiveSubscription(req, listingType) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.subscriptionsService.hasActiveSubscriptionForListingType(req.user.id, listingType);
    }
    async getSubscriptionById(req, id) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.subscriptionsService.getSubscriptionById(id, req.user.id);
    }
    async confirmSubscriptionPayment(req, id) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.subscriptionsService.confirmSubscriptionPayment(id, req.user.id);
    }
    async cancelSubscription(req, id, cancelDto) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.subscriptionsService.cancelSubscription(id, req.user.id, cancelDto.cancelAtPeriodEnd !== undefined ? cancelDto.cancelAtPeriodEnd : true);
    }
    async updateSubscription(req, id, updateDto) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        if (updateDto.includesFeatured === undefined) {
            throw new common_1.BadRequestException('includesFeatured is required');
        }
        return await this.subscriptionsService.updateSubscription(id, req.user.id, updateDto.includesFeatured);
    }
    async getPaymentMethod(req, id) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        const subscription = await this.subscriptionsService.getSubscriptionById(id, req.user.id);
        return {
            paymentMethod: subscription.paymentMethod,
            paymentMethodId: subscription.metadata?.paymentMethodId,
            customerId: subscription.metadata?.customerId,
        };
    }
    async updatePaymentMethod(req, id, updateDto) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.subscriptionsService.updatePaymentMethod(id, req.user.id, updateDto.paymentMethodId);
    }
    async syncPayPalSubscription(req, id) {
        if (!req.user || !req.user.id) {
            throw new common_1.UnauthorizedException('User ID is missing. Please log in again.');
        }
        return await this.subscriptionsService.syncPayPalSubscriptionStatus(id, req.user.id);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)('stripe/create'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateStripeSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createStripeSubscription", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)('paypal/create'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreatePayPalSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createPayPalSubscription", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('sync')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getUserSubscriptions", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Get)('check/:listingType'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('listingType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "checkActiveSubscription", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscriptionById", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(':id/confirm-payment'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "confirmSubscriptionPayment", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(':id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CancelSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(':id/update'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Get)(':id/payment-method'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getPaymentMethod", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(':id/payment-method'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdatePaymentMethodDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "updatePaymentMethod", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)(':id/sync-paypal'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "syncPayPalSubscription", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map