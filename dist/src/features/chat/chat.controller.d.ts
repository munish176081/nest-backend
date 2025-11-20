import { ChatService } from './chat.service';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from './dto';
import { Request as ExpressRequest } from 'express';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    initiateChat(listingId: string, req: any): Promise<{
        conversationId: string;
    }>;
    getConversations(req: any, searchTerm?: string, listingId?: string, unreadOnly?: string): Promise<import("./entities/conversation.entity").Conversation[]>;
    getConversation(id: string, req: any): Promise<import("./entities/conversation.entity").Conversation>;
    createConversation(createConversationDto: CreateConversationDto, req: any): Promise<any>;
    getMessages(conversationId: string, limit: string, offset: string, req: any): Promise<import("./entities/message.entity").Message[]>;
    sendMessage(conversationId: string, sendMessageDto: SendMessageDto, req: any): Promise<import("./entities/message.entity").Message>;
    markAsRead(conversationId: string, req: any): Promise<{
        success: boolean;
    }>;
    updateConversation(id: string, updateConversationDto: UpdateConversationDto, req: any): Promise<import("./entities/conversation.entity").Conversation>;
    deleteConversation(id: string, req: any): Promise<{
        success: boolean;
    }>;
    getChatStats(req: any): Promise<{
        totalConversations: number;
        unreadMessages: number;
        activeConversations: number;
        messagesToday: number;
        responseTime: number;
    }>;
    searchMessages(query: string, req: any): Promise<import("./entities/message.entity").Message[]>;
    cleanupDuplicateConversations(req: any): Promise<{
        message: string;
    }>;
    testWebSocket(req: ExpressRequest): Promise<{
        message: string;
        session: string;
        user: string;
        cookies: string;
        timestamp: string;
    }>;
}
