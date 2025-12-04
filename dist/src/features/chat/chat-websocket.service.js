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
var ChatWebSocketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatWebSocketService = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
let ChatWebSocketService = ChatWebSocketService_1 = class ChatWebSocketService {
    constructor(chatService) {
        this.chatService = chatService;
        this.logger = new common_1.Logger(ChatWebSocketService_1.name);
        this.typingUsers = new Map();
    }
    async handleNewMessage(conversationId, message, senderId) {
        try {
            await this.updateConversationAfterMessage(conversationId, message);
            this.sendDeliveryConfirmation(conversationId, message.id, senderId);
            this.logger.log(`Message ${message.id} processed for conversation ${conversationId}`);
        }
        catch (error) {
            this.logger.error(`Error handling new message:`, error);
            throw error;
        }
    }
    async handleTypingIndicator(conversationId, userId, isTyping) {
        try {
            if (!this.typingUsers.has(conversationId)) {
                this.typingUsers.set(conversationId, new Map());
            }
            const conversationTypingUsers = this.typingUsers.get(conversationId);
            if (isTyping) {
                conversationTypingUsers.set(userId, {
                    userId,
                    conversationId,
                    isTyping: true,
                    timestamp: new Date(),
                });
                setTimeout(() => {
                    this.handleTypingIndicator(conversationId, userId, false);
                }, 5000);
            }
            else {
                conversationTypingUsers.delete(userId);
            }
            this.logger.log(`Typing indicator updated for user ${userId} in conversation ${conversationId}: ${isTyping}`);
        }
        catch (error) {
            this.logger.error(`Error handling typing indicator:`, error);
        }
    }
    async handleMessageRead(conversationId, messageIds, userId) {
        try {
            await this.chatService.markMessagesAsRead(conversationId, messageIds, userId);
            await this.broadcastReadReceipt(conversationId, messageIds, userId);
            await this.updateConversationUnreadCount(conversationId);
            this.logger.log(`Messages ${messageIds.join(', ')} marked as read by user ${userId}`);
        }
        catch (error) {
            this.logger.error(`Error handling message read:`, error);
            throw error;
        }
    }
    async handleUserStatusChange(userId, isOnline) {
        try {
            this.logger.log(`User ${userId} status changed to ${isOnline ? 'online' : 'offline'}`);
        }
        catch (error) {
            this.logger.error(`Error handling user status change:`, error);
        }
    }
    async sendDeliveryConfirmation(conversationId, messageId, senderId) {
        try {
        }
        catch (error) {
            this.logger.error(`Error sending delivery confirmation:`, error);
        }
    }
    async broadcastReadReceipt(conversationId, messageIds, userId) {
        try {
        }
        catch (error) {
            this.logger.error(`Error broadcasting read receipt:`, error);
        }
    }
    async updateConversationAfterMessage(conversationId, message) {
        try {
            await this.chatService.updateConversationLastMessage(conversationId, message.id);
            await this.incrementUnreadCountForOthers(conversationId, message.sender_id);
        }
        catch (error) {
            this.logger.error(`Error updating conversation after message:`, error);
        }
    }
    async updateConversationUnreadCount(conversationId) {
        try {
            const unreadCount = await this.chatService.getConversationUnreadCount(conversationId);
            await this.chatService.updateConversationUnreadCount(conversationId, unreadCount);
        }
        catch (error) {
            this.logger.error(`Error updating conversation unread count:`, error);
        }
    }
    async incrementUnreadCountForOthers(conversationId, senderId) {
        try {
            await this.chatService.incrementUnreadCountForOthers(conversationId, senderId);
        }
        catch (error) {
            this.logger.error(`Error incrementing unread count:`, error);
        }
    }
    getTypingUsers(conversationId) {
        const conversationTypingUsers = this.typingUsers.get(conversationId);
        if (!conversationTypingUsers) {
            return [];
        }
        const now = new Date();
        const validTypingUsers = [];
        conversationTypingUsers.forEach((status) => {
            if (now.getTime() - status.timestamp.getTime() < 5000) {
                validTypingUsers.push(status);
            }
            else {
                conversationTypingUsers.delete(status.userId);
            }
        });
        return validTypingUsers;
    }
    cleanupExpiredTypingIndicators() {
        const now = new Date();
        this.typingUsers.forEach((conversationTypingUsers, conversationId) => {
            conversationTypingUsers.forEach((status, userId) => {
                if (now.getTime() - status.timestamp.getTime() >= 5000) {
                    conversationTypingUsers.delete(userId);
                }
            });
            if (conversationTypingUsers.size === 0) {
                this.typingUsers.delete(conversationId);
            }
        });
    }
    getOnlineUsersCount() {
        return 0;
    }
    isUserOnline(userId) {
        return false;
    }
    async getUserActiveConversations(userId) {
        try {
            const conversations = await this.chatService.getUserConversations(userId);
            return conversations.map(c => c.id);
        }
        catch (error) {
            this.logger.error(`Error getting user active conversations:`, error);
            return [];
        }
    }
};
exports.ChatWebSocketService = ChatWebSocketService;
exports.ChatWebSocketService = ChatWebSocketService = ChatWebSocketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatWebSocketService);
//# sourceMappingURL=chat-websocket.service.js.map