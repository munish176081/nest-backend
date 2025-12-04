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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = exports.SubscriptionPaymentMethodEnum = exports.SubscriptionStatusEnum = void 0;
const typeorm_1 = require("typeorm");
const account_entity_1 = require("../../accounts/entities/account.entity");
const listing_entity_1 = require("../../listings/entities/listing.entity");
var SubscriptionStatusEnum;
(function (SubscriptionStatusEnum) {
    SubscriptionStatusEnum["ACTIVE"] = "active";
    SubscriptionStatusEnum["CANCELLED"] = "cancelled";
    SubscriptionStatusEnum["EXPIRED"] = "expired";
    SubscriptionStatusEnum["PAST_DUE"] = "past_due";
    SubscriptionStatusEnum["TRIALING"] = "trialing";
    SubscriptionStatusEnum["INCOMPLETE"] = "incomplete";
    SubscriptionStatusEnum["INCOMPLETE_EXPIRED"] = "incomplete_expired";
    SubscriptionStatusEnum["UNPAID"] = "unpaid";
})(SubscriptionStatusEnum || (exports.SubscriptionStatusEnum = SubscriptionStatusEnum = {}));
var SubscriptionPaymentMethodEnum;
(function (SubscriptionPaymentMethodEnum) {
    SubscriptionPaymentMethodEnum["STRIPE"] = "stripe";
    SubscriptionPaymentMethodEnum["PAYPAL"] = "paypal";
})(SubscriptionPaymentMethodEnum || (exports.SubscriptionPaymentMethodEnum = SubscriptionPaymentMethodEnum = {}));
let Subscription = class Subscription {
};
exports.Subscription = Subscription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Subscription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], Subscription.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'listing_id' }),
    __metadata("design:type", String)
], Subscription.prototype, "listingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], Subscription.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SubscriptionPaymentMethodEnum }),
    __metadata("design:type", String)
], Subscription.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SubscriptionStatusEnum, default: SubscriptionStatusEnum.ACTIVE }),
    __metadata("design:type", String)
], Subscription.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'current_period_start' }),
    __metadata("design:type", Date)
], Subscription.prototype, "currentPeriodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'current_period_end' }),
    __metadata("design:type", Date)
], Subscription.prototype, "currentPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, name: 'cancel_at_period_end' }),
    __metadata("design:type", Boolean)
], Subscription.prototype, "cancelAtPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'canceled_at' }),
    __metadata("design:type", Date)
], Subscription.prototype, "canceledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Subscription.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'AUD' }),
    __metadata("design:type", String)
], Subscription.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true, name: 'listing_type' }),
    __metadata("design:type", String)
], Subscription.prototype, "listingType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, name: 'includes_featured' }),
    __metadata("design:type", Boolean)
], Subscription.prototype, "includesFeatured", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Subscription.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => account_entity_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", account_entity_1.User)
], Subscription.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => listing_entity_1.Listing, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'listing_id' }),
    __metadata("design:type", listing_entity_1.Listing)
], Subscription.prototype, "listing", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Subscription.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Subscription.prototype, "updatedAt", void 0);
exports.Subscription = Subscription = __decorate([
    (0, typeorm_1.Entity)({ name: 'subscriptions' }),
    (0, typeorm_1.Index)('idx_subscriptions_user_id', ['userId']),
    (0, typeorm_1.Index)('idx_subscriptions_listing_id', ['listingId']),
    (0, typeorm_1.Index)('idx_subscriptions_subscription_id', ['subscriptionId']),
    (0, typeorm_1.Index)('idx_subscriptions_status', ['status']),
    (0, typeorm_1.Index)('idx_subscriptions_current_period_end', ['currentPeriodEnd'])
], Subscription);
//# sourceMappingURL=subscription.entity.js.map