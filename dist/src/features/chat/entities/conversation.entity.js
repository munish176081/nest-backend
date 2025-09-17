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
exports.Conversation = exports.ConversationType = void 0;
const typeorm_1 = require("typeorm");
const participant_entity_1 = require("./participant.entity");
const message_entity_1 = require("./message.entity");
const listing_entity_1 = require("../../listings/entities/listing.entity");
var ConversationType;
(function (ConversationType) {
    ConversationType["DIRECT"] = "direct";
    ConversationType["LISTING"] = "listing";
    ConversationType["SUPPORT"] = "support";
})(ConversationType || (exports.ConversationType = ConversationType = {}));
let Conversation = class Conversation {
};
exports.Conversation = Conversation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Conversation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversation.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ConversationType,
        default: ConversationType.DIRECT,
    }),
    __metadata("design:type", String)
], Conversation.prototype, "conversation_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Conversation.prototype, "unreadCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversation.prototype, "listing_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Conversation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Conversation.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => participant_entity_1.Participant, (participant) => participant.conversation, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Conversation.prototype, "participants", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, (message) => message.conversation, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Conversation.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => message_entity_1.Message, { nullable: true }),
    __metadata("design:type", message_entity_1.Message)
], Conversation.prototype, "lastMessage", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => listing_entity_1.Listing, { nullable: true }),
    __metadata("design:type", listing_entity_1.Listing)
], Conversation.prototype, "listing", void 0);
exports.Conversation = Conversation = __decorate([
    (0, typeorm_1.Entity)('conversations')
], Conversation);
//# sourceMappingURL=conversation.entity.js.map