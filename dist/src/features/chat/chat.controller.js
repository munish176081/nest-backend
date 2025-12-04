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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const dto_1 = require("./dto");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    async initiateChat(listingId, req) {
        console.log('🎯 INITIATE CHAT: Controller called with listingId:', listingId);
        console.log('🎯 INITIATE CHAT: User from request:', req.user?.id);
        if (!listingId) {
            console.error('🎯 INITIATE CHAT: Missing listingId');
            throw new common_1.BadRequestException('listingId is required');
        }
        console.log('🎯 INITIATE CHAT: Calling findOrCreateConversation...');
        const conversation = await this.chatService.findOrCreateConversation(listingId, req.user.id);
        console.log('🎯 INITIATE CHAT: Conversation result:', {
            id: conversation?.id,
            participantsCount: conversation?.participants?.length,
            hasMetadata: !!conversation?.metadata,
            hasLastMessage: !!conversation?.lastMessage
        });
        return { conversationId: conversation.id };
    }
    async getConversations(req, searchTerm, listingId, unreadOnly) {
        const userId = req.user.id;
        return this.chatService.getUserConversations(userId, {
            searchTerm,
            listingId,
            unreadOnly: unreadOnly === 'true',
        });
    }
    async getConversation(id, req) {
        const userId = req.user.id;
        console.log('ChatController: getConversation called with:', { id, userId });
        return this.chatService.getConversation(id, userId);
    }
    async createConversation(createConversationDto, req) {
        const userId = req.user.id;
        return this.chatService.createConversation(createConversationDto, userId);
    }
    async getMessages(conversationId, limit = '50', offset = '0', req) {
        const userId = req.user.id;
        const messages = await this.chatService.getConversationMessages(conversationId, userId, parseInt(limit), parseInt(offset));
        console.log('🎯 GET MESSAGES: Found messages:', {
            count: messages?.length,
            messageTypes: messages?.map(m => m.message_type),
            hasListingReferences: messages?.map(m => !!m.listing_reference)
        });
        return messages;
    }
    async sendMessage(conversationId, sendMessageDto, req) {
        const userId = req.user.id;
        return this.chatService.sendMessage(conversationId, sendMessageDto, userId);
    }
    async markAsRead(conversationId, req) {
        const userId = req.user.id;
        return this.chatService.markConversationAsRead(conversationId, userId);
    }
    async updateConversation(id, updateConversationDto, req) {
        const userId = req.user.id;
        return this.chatService.updateConversation(id, updateConversationDto, userId);
    }
    async deleteConversation(id, req) {
        const userId = req.user.id;
        return this.chatService.deleteConversation(id, userId);
    }
    async getChatStats(req) {
        const userId = req.user.id;
        return this.chatService.getChatStats(userId);
    }
    async searchMessages(query, req) {
        const userId = req.user.id;
        return this.chatService.searchMessages(query, userId);
    }
    async cleanupDuplicateConversations(req) {
        const userId = req.user.id;
        console.log('ChatController: Cleanup request from user:', userId);
        await this.chatService.cleanupDuplicateConversations();
        return { message: 'Duplicate conversations cleaned up successfully' };
    }
    async testWebSocket(req) {
        console.log('ChatController: Test WebSocket endpoint called');
        console.log('ChatController: Session:', req.session);
        console.log('ChatController: User:', req.user);
        console.log('ChatController: Cookies:', req.headers.cookie);
        return {
            message: 'WebSocket test endpoint',
            session: req.session ? 'exists' : 'none',
            user: req.user ? 'authenticated' : 'not authenticated',
            cookies: req.headers.cookie || 'none',
            timestamp: new Date().toISOString()
        };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('initiate'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)('listingId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "initiateChat", null);
__decorate([
    (0, common_1.Get)('conversations'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('searchTerm')),
    __param(2, (0, common_1.Query)('listingId')),
    __param(3, (0, common_1.Query)('unreadOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('conversations/:id'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversation", null);
__decorate([
    (0, common_1.Post)('conversations'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateConversationDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Get)('conversations/:id/messages'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('conversations/:id/messages'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Put)('conversations/:id/read'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Put)('conversations/:id'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateConversationDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateConversation", null);
__decorate([
    (0, common_1.Delete)('conversations/:id'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteConversation", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getChatStats", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Query)('query')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "searchMessages", null);
__decorate([
    (0, common_1.Post)('cleanup-duplicates'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "cleanupDuplicateConversations", null);
__decorate([
    (0, common_1.Get)('test-websocket'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "testWebSocket", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map