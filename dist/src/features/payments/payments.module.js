"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const payments_controller_1 = require("./payments.controller");
const payments_service_1 = require("./payments.service");
const payment_logs_service_1 = require("./payment-logs.service");
const authentication_module_1 = require("../authentication/authentication.module");
const users_module_1 = require("../accounts/users.module");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const payment_entity_1 = require("./entities/payment.entity");
const listing_entity_1 = require("../listings/entities/listing.entity");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([payment_entity_1.Payment, listing_entity_1.Listing]),
            authentication_module_1.AuthModule,
            users_module_1.UsersModule,
        ],
        controllers: [payments_controller_1.PaymentsController],
        providers: [payments_service_1.PaymentsService, payment_logs_service_1.PaymentLogsService, LoggedInGuard_1.LoggedInGuard],
        exports: [payments_service_1.PaymentsService, payment_logs_service_1.PaymentLogsService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map