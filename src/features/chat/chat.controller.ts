import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from './dto';
import { Request as ExpressRequest } from 'express';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @UseGuards(LoggedInGuard)
  async getConversations(
    @Request() req,
    @Query('searchTerm') searchTerm?: string,
    @Query('listingId') listingId?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user.id;
    return this.chatService.getUserConversations(userId, {
      searchTerm,
      listingId,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('conversations/:id')
  @UseGuards(LoggedInGuard)
  async getConversation(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    console.log('ChatController: getConversation called with:', { id, userId });
    return this.chatService.getConversation(id, userId);
  }

  @Post('conversations')
  @UseGuards(LoggedInGuard)
  async createConversation(@Body() createConversationDto: CreateConversationDto, @Request() req) {
    const userId = req.user.id;
    return this.chatService.createConversation(createConversationDto, userId);
  }

  @Get('conversations/:id/messages')
  @UseGuards(LoggedInGuard)
  async getMessages(
    @Param('id') conversationId: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.chatService.getConversationMessages(
      conversationId,
      userId,
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Post('conversations/:id/messages')
  @UseGuards(LoggedInGuard)
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.chatService.sendMessage(conversationId, sendMessageDto, userId);
  }

  @Put('conversations/:id/read')
  @UseGuards(LoggedInGuard)
  async markAsRead(@Param('id') conversationId: string, @Request() req) {
    const userId = req.user.id;
    return this.chatService.markConversationAsRead(conversationId, userId);
  }

  @Put('conversations/:id')
  @UseGuards(LoggedInGuard)
  async updateConversation(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.chatService.updateConversation(id, updateConversationDto, userId);
  }

  @Delete('conversations/:id')
  @UseGuards(LoggedInGuard)
  async deleteConversation(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.chatService.deleteConversation(id, userId);
  }

  @Get('stats')
  @UseGuards(LoggedInGuard)
  async getChatStats(@Request() req) {
    const userId = req.user.id;
    return this.chatService.getChatStats(userId);
  }

  @Get('search')
  @UseGuards(LoggedInGuard)
  async searchMessages(
    @Query('query') query: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.chatService.searchMessages(query, userId);
  }

  @Post('cleanup-duplicates')
  @UseGuards(LoggedInGuard)
  async cleanupDuplicateConversations(@Request() req) {
    const userId = req.user.id;
    console.log('ChatController: Cleanup request from user:', userId);
    
    // Only allow admin users or the user themselves to cleanup
    // For now, allow any authenticated user (you can add admin check later)
    await this.chatService.cleanupDuplicateConversations();
    
    return { message: 'Duplicate conversations cleaned up successfully' };
  }

  @Get('test-websocket')
  async testWebSocket(@Req() req: ExpressRequest) {
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
} 