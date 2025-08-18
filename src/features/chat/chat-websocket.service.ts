import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Message, MessageType } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';

export interface TypingStatus {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface MessageDeliveryStatus {
  messageId: string;
  conversationId: string;
  deliveredTo: string[];
  readBy: string[];
  timestamp: Date;
}

@Injectable()
export class ChatWebSocketService {
  private readonly logger = new Logger(ChatWebSocketService.name);
  private typingUsers = new Map<string, Map<string, TypingStatus>>(); // conversationId -> Map<userId, TypingStatus>

  constructor(
    private readonly chatService: ChatService,
  ) {}

  /**
   * Handle new message and broadcast to all participants
   * Note: Broadcasting is now handled by the ChatGateway directly
   */
  async handleNewMessage(
    conversationId: string,
    message: Message,
    senderId: string,
  ): Promise<void> {
    try {
      // Update conversation's last message and unread count
      await this.updateConversationAfterMessage(conversationId, message);

      // Send delivery confirmation to sender
      this.sendDeliveryConfirmation(conversationId, message.id, senderId);

      this.logger.log(`Message ${message.id} processed for conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Error handling new message:`, error);
      throw error;
    }
  }

  /**
   * Handle typing indicators
   */
  async handleTypingIndicator(
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ): Promise<void> {
    try {
      // Update typing status
      if (!this.typingUsers.has(conversationId)) {
        this.typingUsers.set(conversationId, new Map());
      }

      const conversationTypingUsers = this.typingUsers.get(conversationId)!;

      if (isTyping) {
        conversationTypingUsers.set(userId, {
          userId,
          conversationId,
          isTyping: true,
          timestamp: new Date(),
        });

        // Set timeout to automatically stop typing after 5 seconds
        setTimeout(() => {
          this.handleTypingIndicator(conversationId, userId, false);
        }, 5000);
      } else {
        conversationTypingUsers.delete(userId);
      }

      // Broadcast typing status to other participants
      // await this.chatGateway.broadcastTypingIndicator(conversationId, userId, isTyping); // This line is removed

      this.logger.log(`Typing indicator updated for user ${userId} in conversation ${conversationId}: ${isTyping}`);
    } catch (error) {
      this.logger.error(`Error handling typing indicator:`, error);
    }
  }

  /**
   * Handle message read receipts
   */
  async handleMessageRead(
    conversationId: string,
    messageIds: string[],
    userId: string,
  ): Promise<void> {
    try {
      // Mark messages as read in database
      await this.chatService.markMessagesAsRead(conversationId, messageIds, userId);

      // Broadcast read receipt to other participants
      await this.broadcastReadReceipt(conversationId, messageIds, userId);

      // Update conversation unread count
      await this.updateConversationUnreadCount(conversationId);

      this.logger.log(`Messages ${messageIds.join(', ')} marked as read by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error handling message read:`, error);
      throw error;
    }
  }

  /**
   * Handle user online/offline status
   */
  async handleUserStatusChange(userId: string, isOnline: boolean): Promise<void> {
    try {
      // Broadcast status change to all conversation participants
      // await this.chatGateway.broadcastUserStatus(userId, isOnline); // This line is removed

      this.logger.log(`User ${userId} status changed to ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      this.logger.error(`Error handling user status change:`, error);
    }
  }

  /**
   * Send message delivery confirmation
   */
  private async sendDeliveryConfirmation(
    conversationId: string,
    messageId: string,
    senderId: string,
  ): Promise<void> {
    try {
      // const senderSocket = this.chatGateway.getUserSocket(senderId); // This line is removed
      // if (senderSocket) { // This line is removed
      //   senderSocket.emit('message_delivered', { // This line is removed
      //     messageId, // This line is removed
      //     conversationId, // This line is removed
      //     timestamp: new Date(), // This line is removed
      //   }); // This line is removed
      // } // This line is removed
    } catch (error) {
      this.logger.error(`Error sending delivery confirmation:`, error);
    }
  }

  /**
   * Broadcast read receipt to other participants
   */
  private async broadcastReadReceipt(
    conversationId: string,
    messageIds: string[],
    userId: string,
  ): Promise<void> {
    try {
      // this.chatGateway.server.to(`conversation:${conversationId}`).emit('messages_read', { // This line is removed
      //   conversationId, // This line is removed
      //   userId, // This line is removed
      //   messageIds, // This line is removed
      //   timestamp: new Date(), // This line is removed
      // }); // This line is removed
    } catch (error) {
      this.logger.error(`Error broadcasting read receipt:`, error);
    }
  }

  /**
   * Update conversation after new message
   */
  private async updateConversationAfterMessage(
    conversationId: string,
    message: Message,
  ): Promise<void> {
    try {
      // Update conversation's last message and timestamp
      await this.chatService.updateConversationLastMessage(conversationId, message.id);

      // Increment unread count for other participants
      await this.incrementUnreadCountForOthers(conversationId, message.sender_id);
    } catch (error) {
      this.logger.error(`Error updating conversation after message:`, error);
    }
  }

  /**
   * Update conversation unread count
   */
  private async updateConversationUnreadCount(conversationId: string): Promise<void> {
    try {
      const unreadCount = await this.chatService.getConversationUnreadCount(conversationId);
      await this.chatService.updateConversationUnreadCount(conversationId, unreadCount);
    } catch (error) {
      this.logger.error(`Error updating conversation unread count:`, error);
    }
  }

  /**
   * Increment unread count for other participants
   */
  private async incrementUnreadCountForOthers(
    conversationId: string,
    senderId: string,
  ): Promise<void> {
    try {
      await this.chatService.incrementUnreadCountForOthers(conversationId, senderId);
    } catch (error) {
      this.logger.error(`Error incrementing unread count:`, error);
    }
  }

  /**
   * Get typing users for a conversation
   */
  getTypingUsers(conversationId: string): TypingStatus[] {
    const conversationTypingUsers = this.typingUsers.get(conversationId);
    if (!conversationTypingUsers) {
      return [];
    }

    // Filter out expired typing indicators (older than 5 seconds)
    const now = new Date();
    const validTypingUsers: TypingStatus[] = [];

    conversationTypingUsers.forEach((status) => {
      if (now.getTime() - status.timestamp.getTime() < 5000) {
        validTypingUsers.push(status);
      } else {
        conversationTypingUsers.delete(status.userId);
      }
    });

    return validTypingUsers;
  }

  /**
   * Clean up expired typing indicators
   */
  cleanupExpiredTypingIndicators(): void {
    const now = new Date();
    
    this.typingUsers.forEach((conversationTypingUsers, conversationId) => {
      conversationTypingUsers.forEach((status, userId) => {
        if (now.getTime() - status.timestamp.getTime() >= 5000) {
          conversationTypingUsers.delete(userId);
        }
      });

      // Remove conversation if no typing users
      if (conversationTypingUsers.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    });
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    // return this.chatGateway.getOnlineUsers().length; // This line is removed
    return 0; // Placeholder as ChatGateway is removed
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    // return this.chatGateway.isUserOnline(userId); // This line is removed
    return false; // Placeholder as ChatGateway is removed
  }

  /**
   * Get user's active conversations
   */
  async getUserActiveConversations(userId: string): Promise<string[]> {
    try {
      const conversations = await this.chatService.getUserConversations(userId);
      return conversations.map(c => c.id);
    } catch (error) {
      this.logger.error(`Error getting user active conversations:`, error);
      return [];
    }
  }
} 