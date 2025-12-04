"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const subscriptions_controller_1 = require("./subscriptions.controller");
const subscriptions_service_1 = require("./subscriptions.service");
const subscription_webhooks_controller_1 = require("./webhooks/subscription-webhooks.controller");
const subscription_entity_1 = require("./entities/subscription.entity");
const listing_entity_1 = require("../listings/entities/listing.entity");
const payment_entity_1 = require("../payments/entities/payment.entity");
const payment_logs_service_1 = require("../payments/payment-logs.service");
const authentication_module_1 = require("../authentication/authentication.module");
const users_module_1 = require("../accounts/users.module");
const listings_module_1 = require("../listings/listings.module");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let SubscriptionsModule = class SubscriptionsModule {
};
exports.SubscriptionsModule = SubscriptionsModule;
exports.SubscriptionsModule = SubscriptionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([subscription_entity_1.Subscription, listing_entity_1.Listing, payment_entity_1.Payment]),
            authentication_module_1.AuthModule,
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            (0, common_1.forwardRef)(() => listings_module_1.ListingsModule),
        ],
        controllers: [subscriptions_controller_1.SubscriptionsController, subscription_webhooks_controller_1.SubscriptionWebhooksController],
        providers: [subscriptions_service_1.SubscriptionsService, payment_logs_service_1.PaymentLogsService, LoggedInGuard_1.LoggedInGuard],
        exports: [subscriptions_service_1.SubscriptionsService],
    })
], SubscriptionsModule);
//# sourceMappingURL=subscriptions.module.js.map