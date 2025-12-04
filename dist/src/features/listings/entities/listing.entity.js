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
exports.Listing = exports.ListingAvailabilityEnum = exports.ListingCategoryEnum = exports.ListingStatusEnum = exports.ListingTypeEnum = void 0;
const typeorm_1 = require("typeorm");
const account_entity_1 = require("../../accounts/entities/account.entity");
const breed_entity_1 = require("../../breeds/entities/breed.entity");
var ListingTypeEnum;
(function (ListingTypeEnum) {
    ListingTypeEnum["SEMEN_LISTING"] = "SEMEN_LISTING";
    ListingTypeEnum["PUPPY_LISTING"] = "PUPPY_LISTING";
    ListingTypeEnum["PUPPY_LITTER_LISTING"] = "PUPPY_LITTER_LISTING";
    ListingTypeEnum["LITTER_LISTING"] = "LITTER_LISTING";
    ListingTypeEnum["STUD_LISTING"] = "STUD_LISTING";
    ListingTypeEnum["FUTURE_LISTING"] = "FUTURE_LISTING";
    ListingTypeEnum["WANTED_LISTING"] = "WANTED_LISTING";
    ListingTypeEnum["OTHER_SERVICES"] = "OTHER_SERVICES";
})(ListingTypeEnum || (exports.ListingTypeEnum = ListingTypeEnum = {}));
var ListingStatusEnum;
(function (ListingStatusEnum) {
    ListingStatusEnum["DRAFT"] = "draft";
    ListingStatusEnum["PENDING_REVIEW"] = "pending_review";
    ListingStatusEnum["ACTIVE"] = "active";
    ListingStatusEnum["EXPIRED"] = "expired";
    ListingStatusEnum["SUSPENDED"] = "suspended";
    ListingStatusEnum["DELETED"] = "deleted";
})(ListingStatusEnum || (exports.ListingStatusEnum = ListingStatusEnum = {}));
var ListingCategoryEnum;
(function (ListingCategoryEnum) {
    ListingCategoryEnum["BREEDING"] = "breeding";
    ListingCategoryEnum["PUPPY"] = "puppy";
    ListingCategoryEnum["SERVICE"] = "service";
    ListingCategoryEnum["WANTED"] = "wanted";
})(ListingCategoryEnum || (exports.ListingCategoryEnum = ListingCategoryEnum = {}));
var ListingAvailabilityEnum;
(function (ListingAvailabilityEnum) {
    ListingAvailabilityEnum["AVAILABLE"] = "available";
    ListingAvailabilityEnum["RESERVED"] = "reserved";
    ListingAvailabilityEnum["SOLD_OUT"] = "sold_out";
    ListingAvailabilityEnum["DRAFT"] = "draft";
})(ListingAvailabilityEnum || (exports.ListingAvailabilityEnum = ListingAvailabilityEnum = {}));
let Listing = class Listing {
};
exports.Listing = Listing;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Listing.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: ListingStatusEnum.DRAFT }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: ListingAvailabilityEnum.AVAILABLE }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "availability", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Listing.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Listing.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], Listing.prototype, "fields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Listing.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, typeorm_1.Index)('idx_listings_mother_info', { synchronize: false }),
    __metadata("design:type", Object)
], Listing.prototype, "motherInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, typeorm_1.Index)('idx_listings_father_info', { synchronize: false }),
    __metadata("design:type", Object)
], Listing.prototype, "fatherInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, typeorm_1.Index)('idx_listings_stud_info', { synchronize: false }),
    __metadata("design:type", Object)
], Listing.prototype, "studInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Listing.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "breed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "breedId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Listing.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Listing.prototype, "startedOrRenewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Listing.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Listing.prototype, "suspendedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Listing.prototype, "suspensionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Listing.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Listing.prototype, "favoriteCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Listing.prototype, "contactCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Listing.prototype, "isFeatured", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Listing.prototype, "isPremium", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Listing.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Listing.prototype, "isImportedFromCsv", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'payment_id' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'subscription_id' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Listing.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Listing.prototype, "seoData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Listing.prototype, "analytics", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => account_entity_1.User, (user) => user.listings, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", account_entity_1.User)
], Listing.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => breed_entity_1.Breed, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'breedId' }),
    __metadata("design:type", breed_entity_1.Breed)
], Listing.prototype, "breedRelation", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Listing.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Listing.prototype, "updatedAt", void 0);
exports.Listing = Listing = __decorate([
    (0, typeorm_1.Entity)({ name: 'listings' }),
    (0, typeorm_1.Index)(['userId', 'status']),
    (0, typeorm_1.Index)(['type', 'status']),
    (0, typeorm_1.Index)(['category', 'status']),
    (0, typeorm_1.Index)(['expiresAt']),
    (0, typeorm_1.Index)(['createdAt'])
], Listing);
//# sourceMappingURL=listing.entity.js.map