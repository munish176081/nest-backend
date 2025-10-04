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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const core_1 = require("@nestjs/core");
const event_emitter_1 = require("@nestjs/event-emitter");
const conversation_entity_1 = require("./entities/conversation.entity");
const participant_entity_1 = require("./entities/participant.entity");
const message_entity_1 = require("./entities/message.entity");
const users_service_1 = require("../accounts/users.service");
const listings_service_1 = require("../listings/listings.service");
const listings_repository_1 = require("../listings/listings.repository");
const account_entity_1 = require("../accounts/entities/account.entity");
let ChatService = class ChatService {
    constructor(conversationRepository, messageRepository, participantRepository, userRepository, usersService, listingsService, moduleRef, eventEmitter, listingsRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.usersService = usersService;
        this.listingsService = listingsService;
        this.moduleRef = moduleRef;
        this.eventEmitter = eventEmitter;
        this.listingsRepository = listingsRepository;
    }
    async getUserConversations(userId, filters = {}) {
        console.log('ChatService: Getting conversations for user:', userId, 'filters:', filters);
        const query = this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participants')
            .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
            .leftJoinAndSelect('conversation.listing', 'listing')
            .where('participants.user_id = :userId', { userId })
            .andWhere('conversation.isActive = :isActive', { isActive: true });
        if (filters.listingId) {
            query.andWhere('conversation.listing_id = :listingId', { listingId: filters.listingId });
        }
        if (filters.unreadOnly) {
            query.andWhere('conversation.unread_count > 0');
        }
        if (filters.searchTerm) {
            query.andWhere('(conversation.subject ILIKE :searchTerm OR participants.name ILIKE :searchTerm OR lastMessage.content ILIKE :searchTerm)', { searchTerm: `%${filters.searchTerm}%` });
        }
        console.log('ChatService: Executing query...');
        const conversations = await query
            .orderBy('conversation.updatedAt', 'DESC')
            .getMany();
        console.log('ChatService: Found conversations:', conversations.length, conversations.map(c => ({ id: c.id, participants: c.participants?.length })));
        for (const conversation of conversations) {
            const allParticipants = await this.participantRepository.find({
                where: { conversation_id: conversation.id }
            });
            conversation.participants = allParticipants;
            conversation.unreadCount = await this.getUnreadCount(conversation.id, userId);
        }
        return conversations;
    }
    async getConversation(id, userId) {
        console.log('ChatService: getConversation called with id:', id, 'userId:', userId);
        const conversationExists = await this.conversationRepository.findOne({ where: { id } });
        console.log('ChatService: Conversation exists check:', conversationExists ? 'YES' : 'NO');
        if (conversationExists) {
            console.log('ChatService: Conversation found, checking participants...');
            const participant = await this.participantRepository.findOne({
                where: { conversation_id: id, user_id: userId }
            });
            console.log('ChatService: User is participant:', participant ? 'YES' : 'NO');
            if (participant) {
                console.log('ChatService: Participant found:', participant);
            }
            else {
                console.log('ChatService: Participant not found for user:', userId);
            }
        }
        const conversation = await this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participants')
            .leftJoinAndSelect('conversation.listing', 'listing')
            .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
            .where('conversation.id = :id', { id })
            .getOne();
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const isParticipant = conversation.participants.some(p => p.user_id === userId);
        if (!isParticipant) {
            throw new common_1.ForbiddenException('You are not a participant in this conversation');
        }
        return conversation;
    }
    async createConversation(createConversationDto, userId) {
        console.log('ChatService: Creating conversation with:', { createConversationDto, userId });
        const isParticipant = createConversationDto.participants.some(p => p.userId === userId);
        if (!isParticipant) {
            throw new common_1.ForbiddenException('You can only create conversations where you are a participant');
        }
        const existingConversation = await this.findExistingConversation(createConversationDto.participants, createConversationDto.listingId);
        if (existingConversation) {
            console.log('ChatService: Found existing conversation:', existingConversation.id);
            return existingConversation;
        }
        let sellerId;
        if (createConversationDto.listingId) {
            try {
                const listing = await this.listingsService.getListingById(createConversationDto.listingId);
                if (!listing) {
                    throw new common_1.NotFoundException('Listing not found');
                }
                sellerId = listing.userId;
                console.log('ChatService: Found seller ID:', sellerId);
                const hasSeller = createConversationDto.participants.some(p => p.userId === sellerId);
                if (!hasSeller) {
                    throw new common_1.BadRequestException('Seller must be included in the conversation participants');
                }
                if (userId === sellerId) {
                    throw new common_1.BadRequestException('You cannot create a conversation with yourself');
                }
            }
            catch (error) {
                throw new common_1.NotFoundException('Listing not found');
            }
        }
        console.log('ChatService: Creating new conversation entity...');
        const conversation = this.conversationRepository.create({
            subject: createConversationDto.subject,
            listing_id: createConversationDto.listingId,
            conversation_type: createConversationDto.conversationType || conversation_entity_1.ConversationType.DIRECT,
            isActive: true,
            unreadCount: 0,
        });
        const savedConversation = await this.conversationRepository.save(conversation);
        console.log('ChatService: Saved conversation with ID:', savedConversation.id);
        console.log('ChatService: Creating participants...');
        console.log('ChatService: Participant data to create:', createConversationDto.participants);
        const participants = createConversationDto.participants.map(participantData => {
            console.log('ChatService: Creating participant:', participantData);
            return this.participantRepository.create({
                conversation_id: savedConversation.id,
                user_id: participantData.userId,
                name: participantData.name,
                avatar: participantData.avatar,
                role: participantData.role,
            });
        });
        console.log('ChatService: Created participant entities:', participants.length);
        console.log('ChatService: Participant entities:', participants);
        try {
            const savedParticipants = await this.participantRepository.save(participants);
            console.log('ChatService: Successfully saved participants:', savedParticipants.length);
            console.log('ChatService: Saved participant IDs:', savedParticipants.map(p => p.id));
            console.log('ChatService: Saved participant user IDs:', savedParticipants.map(p => p.user_id));
        }
        catch (error) {
            console.error('ChatService: Error saving participants:', error);
            console.error('ChatService: Error details:', error.message);
            console.error('ChatService: Error stack:', error.stack);
            throw error;
        }
        console.log('ChatService: Constructing conversation response...');
        const conversationResponse = {
            ...savedConversation,
            participants: participants.map(p => ({
                id: p.id,
                userId: p.user_id,
                name: p.name,
                avatar: p.avatar,
                role: p.role,
                isOnline: p.isOnline,
                lastSeen: p.lastSeen,
                unreadCount: p.unreadCount,
                conversationId: p.conversation_id,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
            })),
            listing: createConversationDto.listingId ? { id: createConversationDto.listingId } : null,
            lastMessage: null,
            messages: [],
        };
        console.log('ChatService: Successfully created conversation:', conversationResponse.id, 'with participants:', conversationResponse.participants.length);
        try {
            const eventPayload = {
                conversation: conversationResponse,
                participants: conversationResponse.participants,
                timestamp: new Date(),
            };
            console.log('ChatService: Emitting chat.conversation.created event with payload:', {
                conversationId: conversationResponse.id,
                participantCount: conversationResponse.participants.length,
                participants: conversationResponse.participants.map(p => ({ userId: p.userId, name: p.name }))
            });
            this.eventEmitter.emit('chat.conversation.created', eventPayload);
            console.log('ChatService: Conversation created event emitted for WebSocket broadcasting');
        }
        catch (error) {
            console.warn('ChatService: Event emission failed, but conversation was created:', error);
        }
        return conversationResponse;
    }
    async findExistingConversation(participants, listingId) {
        try {
            const participantIds = participants.map(p => p.userId).sort();
            console.log('ChatService: Looking for conversation with participants:', participantIds);
            if (participantIds.length !== 2) {
                console.log('ChatService: Only supporting 2 participants for now, participants:', participantIds.length);
                return null;
            }
            const [user1Id, user2Id] = participantIds;
            const existingConversation = await this.conversationRepository
                .createQueryBuilder('conversation')
                .leftJoinAndSelect('conversation.participants', 'p1')
                .leftJoinAndSelect('conversation.participants', 'p2')
                .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
                .leftJoinAndSelect('conversation.listing', 'listing')
                .where('conversation.isActive = :isActive', { isActive: true })
                .andWhere('p1.user_id = :user1Id', { user1Id })
                .andWhere('p2.user_id = :user2Id', { user2Id })
                .andWhere('p1.conversation_id = p2.conversation_id')
                .andWhere('p1.id != p2.id')
                .getOne();
            if (existingConversation) {
                console.log('ChatService: Found existing conversation with ID:', existingConversation.id);
                if (listingId && existingConversation.listing_id !== listingId) {
                    console.log('ChatService: Listing mismatch, expected:', listingId, 'got:', existingConversation.listing_id);
                    return null;
                }
                return existingConversation;
            }
            console.log('ChatService: No existing conversation found with exact participants');
            return null;
        }
        catch (error) {
            console.error('ChatService: Error finding existing conversation:', error);
            return null;
        }
    }
    async getOrCreateConversation(participants, listingId, subject) {
        console.log('ChatService: getOrCreateConversation called with participants:', participants.map(p => p.userId));
        console.log('ChatService: listingId:', listingId, 'subject:', subject);
        const existingConversation = await this.findExistingConversation(participants, listingId);
        if (existingConversation) {
            console.log('ChatService: Returning existing conversation:', existingConversation.id);
            return existingConversation;
        }
        console.log('ChatService: No existing conversation found, creating new one with participants:', participants.map(p => p.userId));
        const newConversation = await this.createConversation({
            participants,
            listingId,
            subject,
            conversationType: listingId ? 'listing' : 'direct',
        }, participants[0].userId);
        console.log('ChatService: Successfully created new conversation:', newConversation.id);
        return newConversation;
    }
    async getConversationByParticipants(participantIds, listingId) {
        try {
            if (participantIds.length === 0) {
                return null;
            }
            const conversations = await this.conversationRepository
                .createQueryBuilder('conversation')
                .leftJoinAndSelect('conversation.participants', 'participants')
                .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
                .leftJoinAndSelect('conversation.listing', 'listing')
                .where('conversation.isActive = :isActive', { isActive: true })
                .andWhere('participants.user_id = :userId', { userId: participantIds[0] })
                .getMany();
            for (const conversation of conversations) {
                if (listingId && conversation.listing_id !== listingId) {
                    continue;
                }
                const conversationParticipantIds = conversation.participants.map(p => p.user_id);
                if (conversationParticipantIds.length === participantIds.length &&
                    participantIds.every(id => conversationParticipantIds.includes(id))) {
                    return conversation;
                }
            }
            return null;
        }
        catch (error) {
            console.error('ChatService: Error getting conversation by participants:', error);
            return null;
        }
    }
    async getConversationMessages(conversationId, userId, limit = 50, offset = 0) {
        const participant = await this.participantRepository.findOne({
            where: { conversation_id: conversationId, user_id: userId }
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this conversation');
        }
        const messages = await this.messageRepository
            .createQueryBuilder('message')
            .where('message.conversation_id = :conversationId', { conversationId })
            .orderBy('message.timestamp', 'DESC')
            .skip(offset)
            .take(limit)
            .getMany();
        return messages.reverse();
    }
    async sendMessage(conversationId, sendMessageDto, userId) {
        const participant = await this.participantRepository.findOne({
            where: { conversation_id: conversationId, user_id: userId }
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this conversation');
        }
        const message = this.messageRepository.create({
            conversation_id: conversationId,
            sender_id: userId,
            content: sendMessageDto.content,
            message_type: sendMessageDto.messageType || message_entity_1.MessageType.TEXT,
            reply_to: sendMessageDto.replyTo,
            attachments: sendMessageDto.attachments,
            listing_reference: sendMessageDto.listingReference,
        });
        const savedMessage = await this.messageRepository.save(message);
        console.log('ChatService: Message saved successfully:', savedMessage.id);
        await this.updateConversationLastMessage(conversationId, savedMessage.id);
        if (sendMessageDto.messageType === 'listing' && sendMessageDto.listingReference) {
            await this.updateConversationMetadataWithListing(conversationId, sendMessageDto.listingReference);
        }
        await this.incrementUnreadCountForOthers(conversationId, userId);
        const unreadCount = await this.getConversationUnreadCount(conversationId);
        await this.updateConversationUnreadCount(conversationId, unreadCount);
        try {
            this.eventEmitter.emit('chat.message.sent', {
                conversationId,
                message: savedMessage,
                senderId: userId,
                timestamp: new Date(),
            });
            console.log('ChatService: Message event emitted for WebSocket broadcasting debug new message:', savedMessage);
        }
        catch (error) {
            console.warn('ChatService: Event emission failed, but message was saved debug new message:', error);
        }
        console.log('ChatService: sendMessage completed successfully debug new message:', savedMessage);
        return savedMessage;
    }
    async markConversationAsRead(conversationId, userId) {
        const participant = await this.participantRepository.findOne({
            where: { conversation_id: conversationId, user_id: userId }
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this conversation');
        }
        await this.messageRepository
            .createQueryBuilder()
            .update(message_entity_1.Message)
            .set({ is_read: true })
            .where('conversation_id = :conversationId', { conversationId })
            .andWhere('sender_id != :userId', { userId })
            .andWhere('is_read = :is_read', { is_read: false })
            .execute();
        const unreadCount = await this.getUnreadCount(conversationId, userId);
        await this.conversationRepository.update(conversationId, { unreadCount });
        return { success: true };
    }
    async updateConversation(id, updateConversationDto, userId) {
        const participant = await this.participantRepository.findOne({
            where: { conversation_id: id, user_id: userId }
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this conversation');
        }
        await this.conversationRepository.update(id, updateConversationDto);
        const updatedConversation = await this.conversationRepository.findOne({
            where: { id },
            relations: ['participants', 'listing']
        });
        if (!updatedConversation) {
            throw new common_1.NotFoundException('Conversation not found after update');
        }
        return updatedConversation;
    }
    async deleteConversation(id, userId) {
        const participant = await this.participantRepository.findOne({
            where: { conversation_id: id, user_id: userId }
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this conversation');
        }
        await this.conversationRepository.update(id, { isActive: false });
        return { success: true };
    }
    async getChatStats(userId) {
        const totalConversations = await this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoin('conversation.participants', 'participants')
            .where('participants.user_id = :userId', { userId })
            .andWhere('conversation.isActive = :isActive', { isActive: true })
            .getCount();
        const unreadMessages = await this.messageRepository
            .createQueryBuilder('message')
            .leftJoin('message.conversation', 'conversation')
            .leftJoin('conversation.participants', 'participants')
            .where('participants.user_id = :userId', { userId })
            .andWhere('message.sender_id != :userId', { userId })
            .andWhere('message.is_read = :is_read', { is_read: false })
            .getCount();
        const activeConversations = await this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoin('conversation.participants', 'participants')
            .where('participants.user_id = :userId', { userId })
            .andWhere('conversation.isActive = :isActive', { isActive: true })
            .andWhere('conversation.updatedAt > :yesterday', {
            yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000)
        })
            .getCount();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const messagesToday = await this.messageRepository
            .createQueryBuilder('message')
            .leftJoin('message.conversation', 'conversation')
            .leftJoin('conversation.participants', 'participants')
            .where('participants.user_id = :userId', { userId })
            .andWhere('message.timestamp >= :today', { today })
            .getCount();
        return {
            totalConversations,
            unreadMessages,
            activeConversations,
            messagesToday,
            responseTime: 15,
        };
    }
    async searchMessages(query, userId) {
        const messages = await this.messageRepository
            .createQueryBuilder('message')
            .leftJoin('message.conversation', 'conversation')
            .leftJoin('conversation.participants', 'participants')
            .where('participants.user_id = :userId', { userId })
            .andWhere('message.content ILIKE :query', { query: `%${query}%` })
            .orderBy('message.timestamp', 'DESC')
            .getMany();
        return messages;
    }
    async getUnreadCount(conversationId, userId) {
        return this.messageRepository
            .createQueryBuilder('message')
            .where('message.conversation_id = :conversationId', { conversationId })
            .andWhere('message.sender_id != :userId', { userId })
            .andWhere('message.is_read = :is_read', { is_read: false })
            .getCount();
    }
    async markMessagesAsRead(conversationId, messageIds, userId) {
        await this.getConversation(conversationId, userId);
        await this.messageRepository
            .createQueryBuilder()
            .update(message_entity_1.Message)
            .set({ is_read: true })
            .whereInIds(messageIds)
            .andWhere('conversation_id = :conversationId', { conversationId })
            .andWhere('sender_id != :userId', { userId })
            .andWhere('is_read = :is_read', { is_read: false })
            .execute();
        const unreadCount = await this.getUnreadCount(conversationId, userId);
        await this.conversationRepository.update(conversationId, { unreadCount });
        return { success: true };
    }
    async updateConversationLastMessage(conversationId, messageId) {
        const message = await this.messageRepository.findOne({ where: { id: messageId } });
        if (message) {
            await this.conversationRepository.update(conversationId, {
                lastMessage: message,
                updatedAt: new Date(),
            });
        }
    }
    async updateConversationMetadataWithListing(conversationId, listingReference) {
        try {
            const conversation = await this.conversationRepository.findOne({
                where: { id: conversationId }
            });
            if (!conversation) {
                console.warn('Conversation not found for metadata update:', conversationId);
                return;
            }
            const updatedMetadata = {
                ...conversation.metadata,
                listingDetails: {
                    id: listingReference.listingId,
                    title: listingReference.title,
                    price: listingReference.price,
                    location: listingReference.location,
                    breed: listingReference.breed || 'Unknown',
                    fields: listingReference.fields || {}
                }
            };
            await this.conversationRepository.update(conversationId, {
                metadata: updatedMetadata,
                updatedAt: new Date(),
            });
            console.log('Conversation metadata updated with listing details:', {
                conversationId,
                listingId: listingReference.listingId,
                hasFields: !!listingReference.fields
            });
        }
        catch (error) {
            console.error('Error updating conversation metadata with listing:', error);
        }
    }
    async incrementUnreadCountForOthers(conversationId, senderId) {
        const participants = await this.participantRepository
            .createQueryBuilder('participant')
            .where('participant.conversation_id = :conversationId', { conversationId })
            .andWhere('participant.user_id != :senderId', { senderId })
            .getMany();
        for (const participant of participants) {
            await this.participantRepository.update(participant.id, {
                unreadCount: (participant.unreadCount || 0) + 1,
            });
        }
    }
    async getConversationUnreadCount(conversationId) {
        const result = await this.messageRepository
            .createQueryBuilder('message')
            .select('COUNT(*)', 'count')
            .where('message.conversation_id = :conversationId', { conversationId })
            .andWhere('message.is_read = :is_read', { is_read: false })
            .getRawOne();
        return parseInt(result.count) || 0;
    }
    async updateConversationUnreadCount(conversationId, unreadCount) {
        await this.conversationRepository.update(conversationId, { unreadCount });
    }
    async getOnlineParticipants(conversationId) {
        const participants = await this.participantRepository.find({
            where: { conversation_id: conversationId },
            select: ['user_id'],
        });
        const userIds = participants.map(p => p.user_id);
        const onlineUsers = [];
        console.warn('ChatService: getOnlineParticipants called, but ChatWebSocketService is not available.');
        return [];
    }
    async getTypingUsers(conversationId) {
        console.warn('ChatService: getTypingUsers called, but ChatWebSocketService is not available.');
        return [];
    }
    async findOrCreateConversation(listingId, buyerId) {
        console.log('🎯 FIND OR CREATE: Called with listingId:', listingId, 'buyerId:', buyerId);
        const listing = await this.listingsRepository.findById(listingId);
        console.log('🎯 FIND OR CREATE: Listing found:', !!listing, listing ? `sellerId: ${listing.userId}` : 'No listing');
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        const sellerId = listing.userId;
        console.log('🎯 FIND OR CREATE: Seller ID:', sellerId);
        console.log('🎯 FIND OR CREATE: Checking for existing conversation...');
        const existingConversation = await this.conversationRepository.createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participants')
            .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
            .innerJoin('conversation.participants', 'p1')
            .innerJoin('conversation.participants', 'p2')
            .where('conversation.listing_id = :listingId', { listingId })
            .andWhere('p1.user_id = :buyerId', { buyerId })
            .andWhere('p2.user_id = :sellerId', { sellerId })
            .getOne();
        if (existingConversation) {
            console.log('🎯 FIND OR CREATE: Found existing conversation:', existingConversation.id);
            console.log('🎯 FIND OR CREATE: Existing conversation has messages:', !!existingConversation.lastMessage);
            if (!existingConversation.lastMessage) {
                console.log('🎯 FIND OR CREATE: Existing conversation has no messages, creating initial message...');
                const initialMessage = this.messageRepository.create({
                    conversation_id: existingConversation.id,
                    sender_id: buyerId,
                    content: `Hi! I'm interested in your ${listing.title}. Could you please provide more information?`,
                    message_type: message_entity_1.MessageType.LISTING,
                    listing_reference: {
                        listingId: listing.id,
                        title: listing.title,
                        fields: listing.fields || {},
                        price: Number(listing.price) || 0,
                        image: listing.metadata?.images?.[0] || '',
                        location: listing.location || ''
                    }
                });
                console.log('🎯 FIND OR CREATE: Initial message:', initialMessage);
                return;
                await this.messageRepository.save(initialMessage);
                console.log('🎯 FIND OR CREATE: Initial message saved for existing conversation:', initialMessage.id);
                await this.updateConversationLastMessage(existingConversation.id, initialMessage.id);
                const updatedConversation = await this.conversationRepository
                    .createQueryBuilder('conversation')
                    .leftJoinAndSelect('conversation.participants', 'participants')
                    .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
                    .where('conversation.id = :id', { id: existingConversation.id })
                    .getOne();
                return updatedConversation || existingConversation;
            }
            console.log('🎯 FIND OR CREATE: Returning existing conversation without event emission');
            return existingConversation;
        }
        console.log('🎯 FIND OR CREATE: No existing conversation found, creating new one...');
        console.log('🎯 FIND OR CREATE: Fetching user information...');
        const [buyer, seller] = await Promise.all([
            this.userRepository.findOne({ where: { id: buyerId } }),
            this.userRepository.findOne({ where: { id: sellerId } })
        ]);
        console.log('🎯 FIND OR CREATE: Users found - Buyer:', !!buyer, 'Seller:', !!seller);
        if (!buyer || !seller) {
            throw new common_1.NotFoundException('User not found');
        }
        const newConversation = this.conversationRepository.create({
            listing_id: listingId,
            conversation_type: conversation_entity_1.ConversationType.LISTING,
            subject: `Inquiry about ${listing.title}`,
            metadata: {
                subject: `Inquiry about ${listing.title}`,
                listingDetails: {
                    id: listing.id,
                    fields: listing.fields || {},
                    title: listing.title,
                    price: listing.price,
                    location: listing.location,
                    breed: listing.breed
                },
                participants: {
                    buyer: {
                        id: buyerId,
                        name: buyer.name || buyer.username,
                        joinedPlatform: buyer.createdAt
                    },
                    seller: {
                        id: sellerId,
                        name: seller.name || seller.username,
                        joinedPlatform: seller.createdAt
                    }
                }
            }
        });
        const savedConversation = await this.conversationRepository.save(newConversation);
        const participants = [
            this.participantRepository.create({
                conversation_id: savedConversation.id,
                user_id: buyerId,
                name: buyer.name || buyer.username,
                avatar: buyer.imageUrl,
                role: participant_entity_1.ParticipantRole.BUYER
            }),
            this.participantRepository.create({
                conversation_id: savedConversation.id,
                user_id: sellerId,
                name: seller.name || seller.username,
                avatar: seller.imageUrl,
                role: participant_entity_1.ParticipantRole.SELLER
            })
        ];
        await this.participantRepository.save(participants);
        console.log('🎯 FIND OR CREATE: Participants saved successfully');
        console.log('🎯 FIND OR CREATE: Creating initial message...');
        const initialMessage = this.messageRepository.create({
            conversation_id: savedConversation.id,
            sender_id: buyerId,
            content: `Hi! I'm interested in your ${listing.title}. Could you please provide more information?`,
            message_type: message_entity_1.MessageType.LISTING,
            listing_reference: {
                listingId: listing.id,
                title: listing.title,
                price: Number(listing.price) || 0,
                image: listing.metadata?.images?.[0] || '',
                fields: listing.fields || {},
                location: listing.location || ''
            }
        });
        await this.messageRepository.save(initialMessage);
        console.log('🎯 FIND OR CREATE: Initial message saved with ID:', initialMessage.id);
        console.log('🎯 FIND OR CREATE: Updating conversation last message...');
        await this.updateConversationLastMessage(savedConversation.id, initialMessage.id);
        console.log('🎯 FIND OR CREATE: Fetching final conversation with relations...');
        const conversationWithParticipants = await this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participants')
            .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
            .where('conversation.id = :id', { id: savedConversation.id })
            .getOne();
        console.log('🎯 FIND OR CREATE: Final conversation:', {
            id: conversationWithParticipants?.id,
            participantsCount: conversationWithParticipants?.participants?.length,
            hasLastMessage: !!conversationWithParticipants?.lastMessage,
            hasMetadata: !!conversationWithParticipants?.metadata
        });
        try {
            const eventPayload = {
                conversation: conversationWithParticipants || savedConversation,
                participants: participants.map(p => ({
                    userId: p.user_id,
                    name: p.name,
                    avatar: p.avatar,
                    role: p.role
                })),
                timestamp: new Date(),
            };
            console.log('🎯 FIND OR CREATE: Emitting chat.conversation.created event with payload:', {
                conversationId: (conversationWithParticipants || savedConversation).id,
                participantCount: participants.length,
                participants: participants.map(p => ({ userId: p.user_id, name: p.name }))
            });
            this.eventEmitter.emit('chat.conversation.created', eventPayload);
            console.log('🎯 FIND OR CREATE: Conversation created event emitted for WebSocket broadcasting');
        }
        catch (error) {
            console.warn('🎯 FIND OR CREATE: Event emission failed, but conversation was created:', error);
        }
        return conversationWithParticipants || savedConversation;
    }
    async cleanupDuplicateConversations() {
        try {
            console.log('ChatService: Starting cleanup of duplicate conversations...');
            const allConversations = await this.conversationRepository.find({
                where: { isActive: true },
                relations: ['participants', 'messages']
            });
            console.log('ChatService: Found', allConversations.length, 'conversations to check');
            const processedConversations = new Set();
            const conversationsToDelete = new Set();
            for (const conversation of allConversations) {
                if (processedConversations.has(conversation.id)) {
                    continue;
                }
                const participantIds = conversation.participants.map(p => p.user_id).sort();
                const participantKey = participantIds.join('|') + (conversation.listing_id || '');
                for (const otherConversation of allConversations) {
                    if (otherConversation.id === conversation.id || processedConversations.has(otherConversation.id)) {
                        continue;
                    }
                    const otherParticipantIds = otherConversation.participants.map(p => p.user_id).sort();
                    const otherParticipantKey = otherParticipantIds.join('|') + (otherConversation.listing_id || '');
                    if (participantKey === otherParticipantKey) {
                        console.log('ChatService: Found duplicate conversation:', otherConversation.id, 'will merge into:', conversation.id);
                        if (otherConversation.messages.length > 0) {
                            await this.messageRepository.update({ conversation_id: otherConversation.id }, { conversation_id: conversation.id });
                            console.log('ChatService: Moved', otherConversation.messages.length, 'messages to conversation:', conversation.id);
                        }
                        conversationsToDelete.add(otherConversation.id);
                        processedConversations.add(otherConversation.id);
                    }
                }
                processedConversations.add(conversation.id);
            }
            for (const conversationId of conversationsToDelete) {
                await this.conversationRepository.delete(conversationId);
                console.log('ChatService: Deleted duplicate conversation:', conversationId);
            }
            console.log('ChatService: Cleanup completed. Deleted', conversationsToDelete.size, 'duplicate conversations');
        }
        catch (error) {
            console.error('ChatService: Error during cleanup:', error);
            throw error;
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(conversation_entity_1.Conversation)),
    __param(1, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(2, (0, typeorm_1.InjectRepository)(participant_entity_1.Participant)),
    __param(3, (0, typeorm_1.InjectRepository)(account_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService,
        listings_service_1.ListingsService,
        core_1.ModuleRef,
        event_emitter_1.EventEmitter2,
        listings_repository_1.ListingsRepository])
], ChatService);
//# sourceMappingURL=chat.service.js.map