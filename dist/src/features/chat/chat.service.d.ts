import { Repository } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Conversation } from './entities/conversation.entity';
import { Participant } from './entities/participant.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from './dto';
import { UsersService } from '../accounts/users.service';
import { ListingsService } from '../listings/listings.service';
import { ListingsRepository } from '../listings/listings.repository';
import { User } from '../accounts/entities/account.entity';
export declare class ChatService {
    private conversationRepository;
    private messageRepository;
    private participantRepository;
    private userRepository;
    private usersService;
    private listingsService;
    private moduleRef;
    private eventEmitter;
    private listingsRepository;
    constructor(conversationRepository: Repository<Conversation>, messageRepository: Repository<Message>, participantRepository: Repository<Participant>, userRepository: Repository<User>, usersService: UsersService, listingsService: ListingsService, moduleRef: ModuleRef, eventEmitter: EventEmitter2, listingsRepository: ListingsRepository);
    getUserConversations(userId: string, filters?: {
        searchTerm?: string;
        listingId?: string;
        unreadOnly?: boolean;
    }): Promise<Conversation[]>;
    getConversation(id: string, userId: string): Promise<Conversation>;
    createConversation(createConversationDto: CreateConversationDto, userId: string): Promise<any>;
    private findExistingConversation;
    getOrCreateConversation(participants: {
        userId: string;
        name: string;
        avatar: string;
        role: 'buyer' | 'seller' | 'admin';
    }[], listingId?: string, subject?: string): Promise<Conversation>;
    getConversationByParticipants(participantIds: string[], listingId?: string): Promise<Conversation | null>;
    getConversationMessages(conversationId: string, userId: string, limit?: number, offset?: number): Promise<Message[]>;
    sendMessage(conversationId: string, sendMessageDto: SendMessageDto, userId: string): Promise<Message>;
    markConversationAsRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    updateConversation(id: string, updateConversationDto: UpdateConversationDto, userId: string): Promise<Conversation>;
    deleteConversation(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    getChatStats(userId: string): Promise<{
        totalConversations: number;
        unreadMessages: number;
        activeConversations: number;
        messagesToday: number;
        responseTime: number;
    }>;
    searchMessages(query: string, userId: string): Promise<Message[]>;
    private getUnreadCount;
    markMessagesAsRead(conversationId: string, messageIds: string[], userId: string): Promise<{
        success: boolean;
    }>;
    updateConversationLastMessage(conversationId: string, messageId: string): Promise<void>;
    updateConversationMetadataWithListing(conversationId: string, listingReference: any): Promise<void>;
    incrementUnreadCountForOthers(conversationId: string, senderId: string): Promise<void>;
    getConversationUnreadCount(conversationId: string): Promise<number>;
    updateConversationUnreadCount(conversationId: string, unreadCount: number): Promise<void>;
    getOnlineParticipants(conversationId: string): Promise<string[]>;
    getTypingUsers(conversationId: string): Promise<any[]>;
    findOrCreateConversation(listingId: string, buyerId: string): Promise<Conversation>;
    cleanupDuplicateConversations(): Promise<void>;
}
