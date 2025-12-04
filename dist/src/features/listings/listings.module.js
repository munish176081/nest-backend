"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const listings_controller_1 = require("./listings.controller");
const listings_service_1 = require("./listings.service");
const listings_repository_1 = require("./listings.repository");
const listing_entity_1 = require("./entities/listing.entity");
const payment_entity_1 = require("../payments/entities/payment.entity");
const subscription_entity_1 = require("../subscriptions/entities/subscription.entity");
const authentication_module_1 = require("../authentication/authentication.module");
const users_module_1 = require("../accounts/users.module");
const breeds_module_1 = require("../breeds/breeds.module");
const subscriptions_module_1 = require("../subscriptions/subscriptions.module");
const email_module_1 = require("../email/email.module");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let ListingsModule = class ListingsModule {
};
exports.ListingsModule = ListingsModule;
exports.ListingsModule = ListingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([listing_entity_1.Listing, payment_entity_1.Payment, subscription_entity_1.Subscription]),
            authentication_module_1.AuthModule,
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            breeds_module_1.BreedsModule,
            (0, common_1.forwardRef)(() => subscriptions_module_1.SubscriptionsModule),
            email_module_1.EmailModule,
        ],
        controllers: [listings_controller_1.ListingsController],
        providers: [listings_service_1.ListingsService, listings_repository_1.ListingsRepository, LoggedInGuard_1.LoggedInGuard],
        exports: [listings_service_1.ListingsService, listings_repository_1.ListingsRepository],
    })
], ListingsModule);
//# sourceMappingURL=listings.module.js.map