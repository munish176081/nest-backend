import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { Participant, ParticipantRole } from './entities/participant.entity';
import { Message, MessageType } from './entities/message.entity';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from './dto';
import { UsersService } from '../accounts/users.service';
import { ListingsService } from '../listings/listings.service';
// import { ChatWebSocketService } from './chat-websocket.service'; // Removed to break circular dependency
import { ListingsRepository } from '../listings/listings.repository';
import { User } from '../accounts/entities/account.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
    private listingsService: ListingsService,
    private moduleRef: ModuleRef,
    private eventEmitter: EventEmitter2,
    private listingsRepository: ListingsRepository,
    // Removed ChatWebSocketService to break circular dependency
  ) {}

  async getUserConversations(
    userId: string,
    filters: {
      searchTerm?: string;
      listingId?: string;
      unreadOnly?: boolean;
    } = {},
  ) {
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
      query.andWhere(
        '(conversation.subject ILIKE :searchTerm OR participants.name ILIKE :searchTerm OR lastMessage.content ILIKE :searchTerm)',
        { searchTerm: `%${filters.searchTerm}%` },
      );
    }

    console.log('ChatService: Executing query...');
    const conversations = await query
      .orderBy('conversation.updatedAt', 'DESC')
      .getMany();

    console.log('ChatService: Found conversations:', conversations.length, conversations.map(c => ({ id: c.id, participants: c.participants?.length })));

    // Now fetch ALL participants for each conversation (not just the current user's)
    for (const conversation of conversations) {
      const allParticipants = await this.participantRepository.find({
        where: { conversation_id: conversation.id }
      });
      conversation.participants = allParticipants;
      
      // Calculate unread count for the current user
      conversation.unreadCount = await this.getUnreadCount(conversation.id, userId);
    }

    return conversations;
  }

  async getConversation(id: string, userId: string) {
    console.log('ChatService: getConversation called with id:', id, 'userId:', userId);
    
    // First, let's check if the conversation exists at all
    const conversationExists = await this.conversationRepository.findOne({ where: { id } });
    console.log('ChatService: Conversation exists check:', conversationExists ? 'YES' : 'NO');
    
    if (conversationExists) {
      console.log('ChatService: Conversation found, checking participants...');
      
      // Check if the user is a participant
      const participant = await this.participantRepository.findOne({
        where: { conversation_id: id, user_id: userId }
      });
      console.log('ChatService: User is participant:', participant ? 'YES' : 'NO');
      
      if (participant) {
        console.log('ChatService: Participant found:', participant);
      } else {
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

    console.log('SUSHIL', conversation);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if the user is a participant in this conversation
    const isParticipant = conversation.participants.some(p => p.user_id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return conversation;
  }

  async createConversation(createConversationDto: CreateConversationDto, userId: string) {
    console.log('ChatService: Creating conversation with:', { createConversationDto, userId });
    
    // Verify that the current user is one of the participants
    const isParticipant = createConversationDto.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You can only create conversations where you are a participant');
    }

    // Check if conversation already exists between these participants
    const existingConversation = await this.findExistingConversation(createConversationDto.participants, createConversationDto.listingId);
    if (existingConversation) {
      console.log('ChatService: Found existing conversation:', existingConversation.id);
      return existingConversation;
    }

    // Verify listing exists if provided and get seller information
    let sellerId: string | undefined;
    if (createConversationDto.listingId) {
      try {
        const listing = await this.listingsService.getListingById(createConversationDto.listingId);
        if (!listing) {
          throw new NotFoundException('Listing not found');
        }
        
        // Get the seller ID from the listing
        sellerId = listing.userId;
        console.log('ChatService: Found seller ID:', sellerId);
        
        // Verify that the seller is included in the participants
        const hasSeller = createConversationDto.participants.some(p => p.userId === sellerId);
        if (!hasSeller) {
          throw new BadRequestException('Seller must be included in the conversation participants');
        }
        
        // Verify that the current user is not the seller (they can't chat with themselves)
        if (userId === sellerId) {
          throw new BadRequestException('You cannot create a conversation with yourself');
        }
      } catch (error) {
        // If listing service throws an error, we'll assume the listing doesn't exist
        throw new NotFoundException('Listing not found');
      }
    }

    console.log('ChatService: Creating new conversation entity...');
    // Create conversation
    const conversation = this.conversationRepository.create({
      subject: createConversationDto.subject,
      listing_id: createConversationDto.listingId,
      conversation_type: (createConversationDto.conversationType as ConversationType) || ConversationType.DIRECT,
      isActive: true,
      unreadCount: 0,
    });

    const savedConversation = await this.conversationRepository.save(conversation);
    console.log('ChatService: Saved conversation with ID:', savedConversation.id);

    console.log('ChatService: Creating participants...');
    console.log('ChatService: Participant data to create:', createConversationDto.participants);
    
    // Create participants
    const participants = createConversationDto.participants.map(participantData => {
      console.log('ChatService: Creating participant:', participantData);
      return this.participantRepository.create({
        conversation_id: savedConversation.id,
        user_id: participantData.userId,
        name: participantData.name,
        avatar: participantData.avatar,
        role: participantData.role as ParticipantRole,
      });
    });

    console.log('ChatService: Created participant entities:', participants.length);
    console.log('ChatService: Participant entities:', participants);

    try {
      const savedParticipants = await this.participantRepository.save(participants);
      console.log('ChatService: Successfully saved participants:', savedParticipants.length);
      console.log('ChatService: Saved participant IDs:', savedParticipants.map(p => p.id));
      console.log('ChatService: Saved participant user IDs:', savedParticipants.map(p => p.user_id));
    } catch (error) {
      console.error('ChatService: Error saving participants:', error);
      console.error('ChatService: Error details:', error.message);
      console.error('ChatService: Error stack:', error.stack);
      throw error;
    }

    console.log('ChatService: Constructing conversation response...');
    // Instead of reloading, construct the response manually with the participants we just created
    const conversationResponse: any = {
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
    return conversationResponse;
  }

  /**
   * Find existing conversation between the same participants
   * This prevents creating duplicate conversations
   */
  private async findExistingConversation(
    participants: { userId: string }[],
    listingId?: string
  ): Promise<Conversation | null> {
    try {
      const participantIds = participants.map(p => p.userId).sort(); // Sort for consistent comparison
      console.log('ChatService: Looking for conversation with participants:', participantIds);
      
      if (participantIds.length !== 2) {
        console.log('ChatService: Only supporting 2 participants for now, participants:', participantIds.length);
        return null;
      }

      // For 2 participants, we can use a simpler approach
      // Find conversations where both participants exist
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
        .andWhere('p1.conversation_id = p2.conversation_id') // Ensure same conversation
        .andWhere('p1.id != p2.id') // Ensure different participant records
        .getOne();

      if (existingConversation) {
        console.log('ChatService: Found existing conversation with ID:', existingConversation.id);
        
        // Additional check: verify listing matches if provided
        if (listingId && existingConversation.listing_id !== listingId) {
          console.log('ChatService: Listing mismatch, expected:', listingId, 'got:', existingConversation.listing_id);
          return null;
        }
        
        return existingConversation;
      }

      console.log('ChatService: No existing conversation found with exact participants');
      return null;
    } catch (error) {
      console.error('ChatService: Error finding existing conversation:', error);
      return null;
    }
  }

  /**
   * Get or create a conversation between participants
   * This is the preferred method to use instead of createConversation directly
   */
  async getOrCreateConversation(
    participants: { userId: string; name: string; avatar: string; role: 'buyer' | 'seller' | 'admin' }[],
    listingId?: string,
    subject?: string
  ): Promise<Conversation> {
    console.log('ChatService: getOrCreateConversation called with participants:', participants.map(p => p.userId));
    console.log('ChatService: listingId:', listingId, 'subject:', subject);
    
    // First, try to find existing conversation
    const existingConversation = await this.findExistingConversation(participants, listingId);
    if (existingConversation) {
      console.log('ChatService: Returning existing conversation:', existingConversation.id);
      return existingConversation;
    }

    // If no existing conversation found, create a new one
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

  /**
   * Get conversation by participant IDs (useful for finding existing conversations)
   */
  async getConversationByParticipants(
    participantIds: string[],
    listingId?: string
  ): Promise<Conversation | null> {
    try {
      if (participantIds.length === 0) {
        return null;
      }

      // Find conversations that have the first participant
      const conversations = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.participants', 'participants')
        .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .leftJoinAndSelect('conversation.listing', 'listing')
        .where('conversation.isActive = :isActive', { isActive: true })
        .andWhere('participants.user_id = :userId', { userId: participantIds[0] })
        .getMany();

      // Filter to find exact participant matches
      for (const conversation of conversations) {
        // Check if listing matches (if listingId is provided)
        if (listingId && conversation.listing_id !== listingId) {
          continue;
        }

        const conversationParticipantIds = conversation.participants.map(p => p.user_id);
        
        // Check for exact participant match
        if (conversationParticipantIds.length === participantIds.length &&
            participantIds.every(id => conversationParticipantIds.includes(id))) {
          return conversation;
        }
      }

      return null;
    } catch (error) {
      console.error('ChatService: Error getting conversation by participants:', error);
      return null;
    }
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Verify user has access to this conversation using a simple query
    const participant = await this.participantRepository.findOne({
      where: { conversation_id: conversationId, user_id: userId }
    });
    
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversation_id = :conversationId', { conversationId })
      .orderBy('message.timestamp', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return messages.reverse(); // Return in chronological order
  }

  async sendMessage(conversationId: string, sendMessageDto: SendMessageDto, userId: string) {
    console.log('ChatService: sendMessage called with:', { conversationId, sendMessageDto, userId });
    console.log('ChatService: conversationId type:', typeof conversationId, 'value:', conversationId);
    console.log('ChatService: userId type:', typeof userId, 'value:', userId);
    
    // Verify user is a participant in this conversation using a simple query
    const participant = await this.participantRepository.findOne({
      where: { conversation_id: conversationId, user_id: userId }
    });
    
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    console.log('ChatService: User is participant, creating message...');

    // Create and save the message
    const message = this.messageRepository.create({
      conversation_id: conversationId,
      sender_id: userId,
      content: sendMessageDto.content,
      message_type: (sendMessageDto.messageType as MessageType) || MessageType.TEXT,
      reply_to: sendMessageDto.replyTo,
      attachments: sendMessageDto.attachments,
      listing_reference: sendMessageDto.listingReference,
    });

    const savedMessage = await this.messageRepository.save(message);
    console.log('ChatService: Message saved successfully:', savedMessage.id);

    // Update conversation's last message
    await this.updateConversationLastMessage(conversationId, savedMessage.id);

    // Increment unread count for other participants
    await this.incrementUnreadCountForOthers(conversationId, userId);

    // Update conversation unread count
    const unreadCount = await this.getConversationUnreadCount(conversationId);
    await this.updateConversationUnreadCount(conversationId, unreadCount);

    // Emit event for WebSocket broadcasting
    try {
      this.eventEmitter.emit('chat.message.sent', {
        conversationId,
        message: savedMessage,
        senderId: userId,
        timestamp: new Date(),
      });
      console.log('ChatService: Message event emitted for WebSocket broadcasting');
    } catch (error) {
      console.warn('ChatService: Event emission failed, but message was saved:', error);
    }

    console.log('ChatService: sendMessage completed successfully');
    return savedMessage;
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    // Verify user has access to this conversation using a simple query
    const participant = await this.participantRepository.findOne({
      where: { conversation_id: conversationId, user_id: userId }
    });
    
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Mark all unread messages as read
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ is_read: true })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('is_read = :is_read', { is_read: false })
      .execute();

    // Update conversation unread count
    const unreadCount = await this.getUnreadCount(conversationId, userId);
    await this.conversationRepository.update(conversationId, { unreadCount });

    return { success: true };
  }

  async updateConversation(
    id: string,
    updateConversationDto: UpdateConversationDto,
    userId: string,
  ) {
    // Verify user has access to this conversation using a simple query
    const participant = await this.participantRepository.findOne({
      where: { conversation_id: id, user_id: userId }
    });
    
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    await this.conversationRepository.update(id, updateConversationDto);
    
    // Return the updated conversation using a simple query
    const updatedConversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['participants', 'listing']
    });
    
    if (!updatedConversation) {
      throw new NotFoundException('Conversation not found after update');
    }
    
    return updatedConversation;
  }

  async deleteConversation(id: string, userId: string) {
    // Verify user has access to this conversation using a simple query
    const participant = await this.participantRepository.findOne({
      where: { conversation_id: id, user_id: userId }
    });
    
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Soft delete conversation
    await this.conversationRepository.update(id, { isActive: false });
    return { success: true };
  }

  async getChatStats(userId: string) {
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
      responseTime: 15, // TODO: Calculate actual average response time
    };
  }

  async searchMessages(query: string, userId: string) {
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

  private async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    return this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversation_id = :conversationId', { conversationId })
      .andWhere('message.sender_id != :userId', { userId })
      .andWhere('message.is_read = :is_read', { is_read: false })
      .getCount();
  }

  // New methods for WebSocket integration

  async markMessagesAsRead(conversationId: string, messageIds: string[], userId: string) {
    // Verify user has access to this conversation
    await this.getConversation(conversationId, userId);

    // Mark specific messages as read
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ is_read: true })
      .whereInIds(messageIds)
      .andWhere('conversation_id = :conversationId', { conversationId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('is_read = :is_read', { is_read: false })
      .execute();

    // Update conversation unread count
    const unreadCount = await this.getUnreadCount(conversationId, userId);
    await this.conversationRepository.update(conversationId, { unreadCount });

    return { success: true };
  }

  async updateConversationLastMessage(conversationId: string, messageId: string) {
    // Get the message first
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (message) {
      await this.conversationRepository.update(conversationId, {
        lastMessage: message,
        updatedAt: new Date(),
      });
    }
  }

  async incrementUnreadCountForOthers(conversationId: string, senderId: string) {
    // Get all participants except sender
    const participants = await this.participantRepository
      .createQueryBuilder('participant')
      .where('participant.conversation_id = :conversationId', { conversationId })
      .andWhere('participant.user_id != :senderId', { senderId })
      .getMany();

    // Increment unread count for each participant
    for (const participant of participants) {
      await this.participantRepository.update(participant.id, {
        unreadCount: (participant.unreadCount || 0) + 1,
      });
    }
  }

  async getConversationUnreadCount(conversationId: string): Promise<number> {
    const result = await this.messageRepository
      .createQueryBuilder('message')
      .select('COUNT(*)', 'count')
      .where('message.conversation_id = :conversationId', { conversationId })
      .andWhere('message.is_read = :is_read', { is_read: false })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async updateConversationUnreadCount(conversationId: string, unreadCount: number) {
    await this.conversationRepository.update(conversationId, { unreadCount });
  }

  async getOnlineParticipants(conversationId: string): Promise<string[]> {
    const participants = await this.participantRepository.find({
      where: { conversation_id: conversationId },
      select: ['user_id'],
    });

    const userIds = participants.map(p => p.user_id);
    const onlineUsers: string[] = [];

    // The ChatWebSocketService is no longer injected, so we cannot check online status here directly.
    // This method will return an empty array or throw an error if ChatWebSocketService is not available.
    // For now, we'll return an empty array as a placeholder.
    // If ChatWebSocketService is needed, it must be re-introduced and injected.
    console.warn('ChatService: getOnlineParticipants called, but ChatWebSocketService is not available.');
    return [];
  }

  async getTypingUsers(conversationId: string): Promise<any[]> {
    // The ChatWebSocketService is no longer injected, so we cannot get typing users here directly.
    // This method will return an empty array or throw an error if ChatWebSocketService is not available.
    // For now, we'll return an empty array as a placeholder.
    // If ChatWebSocketService is needed, it must be re-introduced and injected.
    console.warn('ChatService: getTypingUsers called, but ChatWebSocketService is not available.');
    return [];
  }

  async findOrCreateConversation(listingId: string, buyerId: string): Promise<Conversation> {
    console.log('🎯 FIND OR CREATE: Called with listingId:', listingId, 'buyerId:', buyerId);
    
    const listing = await this.listingsRepository.findById(listingId);
    console.log('🎯 FIND OR CREATE: Listing found:', !!listing, listing ? `sellerId: ${listing.userId}` : 'No listing');
    
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const sellerId = listing.userId;
    console.log('🎯 FIND OR CREATE: Seller ID:', sellerId);

    // Check if a conversation already exists
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
      
      // If existing conversation has no messages, create the initial message
      if (!existingConversation.lastMessage) {
        console.log('🎯 FIND OR CREATE: Existing conversation has no messages, creating initial message...');
        
        const initialMessage = this.messageRepository.create({
          conversation_id: existingConversation.id,
          sender_id: buyerId,
          content: `Hi! I'm interested in your ${listing.title}. Could you please provide more information?`,
          message_type: MessageType.LISTING,
          listing_reference: {
            listingId: listing.id,
            title: listing.title,
            price: Number(listing.price) || 0,
            image: listing.metadata?.images?.[0] || '',
            location: listing.location || ''
          }
        });

        await this.messageRepository.save(initialMessage);
        console.log('🎯 FIND OR CREATE: Initial message saved for existing conversation:', initialMessage.id);

        // Update conversation's last message
        await this.updateConversationLastMessage(existingConversation.id, initialMessage.id);
        
        // Re-fetch conversation with updated lastMessage
        const updatedConversation = await this.conversationRepository
          .createQueryBuilder('conversation')
          .leftJoinAndSelect('conversation.participants', 'participants')
          .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
          .where('conversation.id = :id', { id: existingConversation.id })
          .getOne();
          
        return updatedConversation || existingConversation;
      }
      
      return existingConversation;
    }

    console.log('🎯 FIND OR CREATE: No existing conversation found, creating new one...');

    // Fetch user information for both buyer and seller
    console.log('🎯 FIND OR CREATE: Fetching user information...');
    const [buyer, seller] = await Promise.all([
      this.userRepository.findOne({ where: { id: buyerId } }),
      this.userRepository.findOne({ where: { id: sellerId } })
    ]);

    console.log('🎯 FIND OR CREATE: Users found - Buyer:', !!buyer, 'Seller:', !!seller);
    if (!buyer || !seller) {
      throw new NotFoundException('User not found');
    }

    // Create a new conversation
    const newConversation = this.conversationRepository.create({
      listing_id: listingId,
      conversation_type: ConversationType.LISTING,
      subject: `Inquiry about ${listing.title}`,
      metadata: {
        subject: `Inquiry about ${listing.title}`,
        listingDetails: {
          id: listing.id,
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

    // Create participants separately
    const participants = [
      this.participantRepository.create({
        conversation_id: savedConversation.id,
        user_id: buyerId,
        name: buyer.name || buyer.username,
        avatar: buyer.imageUrl,
        role: ParticipantRole.BUYER
      }),
      this.participantRepository.create({
        conversation_id: savedConversation.id,
        user_id: sellerId,
        name: seller.name || seller.username,
        avatar: seller.imageUrl,
        role: ParticipantRole.SELLER
      })
    ];

    await this.participantRepository.save(participants);
    console.log('🎯 FIND OR CREATE: Participants saved successfully');

    // Auto-send initial inquiry message with listing details
    console.log('🎯 FIND OR CREATE: Creating initial message...');
    const initialMessage = this.messageRepository.create({
      conversation_id: savedConversation.id,
      sender_id: buyerId,
      content: `Hi! I'm interested in your ${listing.title}. Could you please provide more information?`,
      message_type: MessageType.LISTING,
      listing_reference: {
        listingId: listing.id,
        title: listing.title,
        price: Number(listing.price) || 0,
        image: listing.metadata?.images?.[0] || '',
        location: listing.location || ''
      }
    });

    await this.messageRepository.save(initialMessage);
    console.log('🎯 FIND OR CREATE: Initial message saved with ID:', initialMessage.id);

    // Update conversation's last message
    console.log('🎯 FIND OR CREATE: Updating conversation last message...');
    await this.updateConversationLastMessage(savedConversation.id, initialMessage.id);

    // Return the conversation with participants populated
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

    return conversationWithParticipants || savedConversation;
  }

  /**
   * Clean up duplicate conversations by merging them
   * This should be called once to fix existing data
   */
  async cleanupDuplicateConversations(): Promise<void> {
    try {
      console.log('ChatService: Starting cleanup of duplicate conversations...');
      
      // Find all conversations
      const allConversations = await this.conversationRepository.find({
        where: { isActive: true },
        relations: ['participants', 'messages']
      });
      
      console.log('ChatService: Found', allConversations.length, 'conversations to check');
      
      const processedConversations = new Set<string>();
      const conversationsToDelete = new Set<string>();
      
      for (const conversation of allConversations) {
        if (processedConversations.has(conversation.id)) {
          continue;
        }
        
        const participantIds = conversation.participants.map(p => p.user_id).sort();
        const participantKey = participantIds.join('|') + (conversation.listing_id || '');
        
        // Find other conversations with same participants
        for (const otherConversation of allConversations) {
          if (otherConversation.id === conversation.id || processedConversations.has(otherConversation.id)) {
            continue;
          }
          
          const otherParticipantIds = otherConversation.participants.map(p => p.user_id).sort();
          const otherParticipantKey = otherParticipantIds.join('|') + (otherConversation.listing_id || '');
          
          if (participantKey === otherParticipantKey) {
            console.log('ChatService: Found duplicate conversation:', otherConversation.id, 'will merge into:', conversation.id);
            
            // Move messages from duplicate to main conversation
            if (otherConversation.messages.length > 0) {
              await this.messageRepository.update(
                { conversation_id: otherConversation.id },
                { conversation_id: conversation.id }
              );
              console.log('ChatService: Moved', otherConversation.messages.length, 'messages to conversation:', conversation.id);
            }
            
            // Mark duplicate conversation for deletion
            conversationsToDelete.add(otherConversation.id);
            processedConversations.add(otherConversation.id);
          }
        }
        
        processedConversations.add(conversation.id);
      }
      
      // Delete duplicate conversations
      for (const conversationId of conversationsToDelete) {
        await this.conversationRepository.delete(conversationId);
        console.log('ChatService: Deleted duplicate conversation:', conversationId);
      }
      
      console.log('ChatService: Cleanup completed. Deleted', conversationsToDelete.size, 'duplicate conversations');
      
    } catch (error) {
      console.error('ChatService: Error during cleanup:', error);
      throw error;
    }
  }
} 