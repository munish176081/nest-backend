import { ChatService } from './chat.service';
import { Message } from './entities/message.entity';
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
export declare class ChatWebSocketService {
    private readonly chatService;
    private readonly logger;
    private typingUsers;
    constructor(chatService: ChatService);
    handleNewMessage(conversationId: string, message: Message, senderId: string): Promise<void>;
    handleTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void>;
    handleMessageRead(conversationId: string, messageIds: string[], userId: string): Promise<void>;
    handleUserStatusChange(userId: string, isOnline: boolean): Promise<void>;
    private sendDeliveryConfirmation;
    private broadcastReadReceipt;
    private updateConversationAfterMessage;
    private updateConversationUnreadCount;
    private incrementUnreadCountForOthers;
    getTypingUsers(conversationId: string): TypingStatus[];
    cleanupExpiredTypingIndicators(): void;
    getOnlineUsersCount(): number;
    isUserOnline(userId: string): boolean;
    getUserActiveConversations(userId: string): Promise<string[]>;
}
