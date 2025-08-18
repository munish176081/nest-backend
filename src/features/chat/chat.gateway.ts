import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { SessionService } from '../authentication/session.service';
import { UsersService } from '../accounts/users.service';

interface ConnectedUser {
  socketId: string;
  userId: string;
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, ConnectedUser>();

  constructor(
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    console.log('ChatGateway: WebSocket Gateway initialized');
  }

  // Listen for chat events from ChatService
  @OnEvent('chat.message.sent')
  async handleMessageSent(payload: {
    conversationId: string;
    message: any;
    senderId: string;
    timestamp: Date;
  }) {
    console.log('ChatGateway: Received chat.message.sent event:', payload);
    await this.broadcastNewMessage(payload.conversationId, payload.message, payload.senderId);
  }

  async handleConnection(client: Socket) {
    try {
      console.log('ChatGateway: Client attempting to connect:', client.id);
      console.log('ChatGateway: Handshake auth:', client.handshake.auth);
      console.log('ChatGateway: Handshake headers:', client.handshake.headers);
      
      // Extract sessionId from handshake auth or headers
      let sessionId = client.handshake.auth.sessionId || 
                     client.handshake.headers.sessionid ||
                     client.handshake.headers['x-session-id'];
      
      // If no sessionId in auth, try to extract from cookies
      if (!sessionId && client.handshake.headers.cookie) {
        console.log('ChatGateway: Checking cookies for session ID');
        const cookies = client.handshake.headers.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'connect.sid') {
            sessionId = value;
            console.log('ChatGateway: Found session ID in cookie:', name, value);
            break;
          }
        }
      }
      
      console.log('ChatGateway: Extracted sessionId:', sessionId);
      
      // TEMPORARY: Allow test connections for debugging
      if (sessionId && sessionId.startsWith('test-session-')) {
        console.log('ChatGateway: Allowing test connection with session ID:', sessionId);
        
        // Create a mock user for testing
        const mockUser = {
          id: 'test-user-' + Date.now(),
          username: 'test-user',
          email: 'test@example.com'
        };
        
        // Store connected user
        this.connectedUsers.set(client.id, {
          socketId: client.id,
          userId: mockUser.id,
          user: mockUser,
        });

        // Join user to their personal room
        await client.join(`user_${mockUser.id}`);
        
        console.log('ChatGateway: Test client connected successfully:', {
          socketId: client.id,
          userId: mockUser.id,
          username: mockUser.username,
        });

        // Broadcast user online status to all connected clients
        this.server.emit('user_status_changed', {
          userId: mockUser.id,
          isOnline: true,
          lastSeen: new Date(),
        });
        
        return;
      }
      
      if (!sessionId) {
        console.log('ChatGateway: No sessionId provided, disconnecting client');
        client.disconnect();
        return;
      }

      // Verify session and get user
      console.log('ChatGateway: Verifying session...');
      const session = await this.sessionService.verifySession(sessionId);
      if (!session) {
        console.log('ChatGateway: Invalid session, disconnecting client');
        client.disconnect();
        return;
      }
      
      console.log('ChatGateway: Session verified, user data:', session);

      const user = await this.usersService.getUserById(session.id || session.userId);
      if (!user) {
        console.log('ChatGateway: User not found, disconnecting client');
        client.disconnect();
        return;
      }

      // Store connected user
      this.connectedUsers.set(client.id, {
        socketId: client.id,
        userId: user.id,
        user,
      });

      // Join user to their personal room
      await client.join(`user_${user.id}`);
      
      console.log('ChatGateway: Client connected successfully:', {
        socketId: client.id,
        userId: user.id,
        username: user.username,
      });

      // Broadcast user online status to all connected clients
      this.server.emit('user_status_changed', {
        userId: user.id,
        isOnline: true,
        lastSeen: new Date(),
      });

    } catch (error) {
      console.error('ChatGateway: Error during connection:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const connectedUser = this.connectedUsers.get(client.id);
    if (connectedUser) {
      console.log('ChatGateway: Client disconnected:', {
        socketId: client.id,
        userId: connectedUser.userId,
        username: connectedUser.user.username,
      });

      // Remove from connected users
      this.connectedUsers.delete(client.id);

      // Broadcast user offline status
      this.server.emit('user_status_changed', {
        userId: connectedUser.userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      if (!connectedUser) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { conversationId } = data;
      
      // Leave previous conversation room if any
      const rooms = Array.from(client.rooms);
      const conversationRooms = rooms.filter(room => room.startsWith('conversation_'));
      for (const room of conversationRooms) {
        await client.leave(room);
      }

      // Join new conversation room
      await client.join(`conversation_${conversationId}`);
      
      console.log('ChatGateway: User joined conversation:', {
        userId: connectedUser.userId,
        conversationId,
        socketId: client.id,
      });

      client.emit('joined_conversation', { conversationId });

    } catch (error) {
      console.error('ChatGateway: Error joining conversation:', error);
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      if (!connectedUser) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { conversationId } = data;
      
      // Leave conversation room
      await client.leave(`conversation_${conversationId}`);
      
      console.log('ChatGateway: User left conversation:', {
        userId: connectedUser.userId,
        conversationId,
        socketId: client.id,
      });

      client.emit('left_conversation', { conversationId });

    } catch (error) {
      console.error('ChatGateway: Error leaving conversation:', error);
      client.emit('error', { message: 'Failed to leave conversation' });
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      if (!connectedUser) return;

      const { conversationId } = data;
      
      // Broadcast typing indicator to conversation room (excluding sender)
      client.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId: connectedUser.userId,
        username: connectedUser.user.username,
        isTyping: true,
      });

    } catch (error) {
      console.error('ChatGateway: Error handling typing start:', error);
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      if (!connectedUser) return;

      const { conversationId } = data;
      
      // Broadcast typing stop to conversation room (excluding sender)
      client.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId: connectedUser.userId,
        username: connectedUser.user.username,
        isTyping: false,
      });

    } catch (error) {
      console.error('ChatGateway: Error handling typing stop:', error);
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { conversationId: string; messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      if (!connectedUser) return;

      const { conversationId, messageIds } = data;
      
      // Broadcast read receipt to conversation room (excluding sender)
      client.to(`conversation_${conversationId}`).emit('messages_read', {
        conversationId,
        userId: connectedUser.userId,
        username: connectedUser.user.username,
        messageIds,
        readAt: new Date(),
      });

    } catch (error) {
      console.error('ChatGateway: Error handling mark read:', error);
    }
  }

  // Method to broadcast new message to conversation participants
  async broadcastNewMessage(conversationId: string, message: any, senderId: string) {
    try {
      console.log('ChatGateway: Broadcasting new message to conversation:', conversationId);
      
      // Broadcast to conversation room (excluding sender)
      this.server.to(`conversation_${conversationId}`).emit('new_message', {
        conversationId,
        message,
        senderId,
        timestamp: new Date(),
      });

      // Also emit to sender for confirmation
      this.server.to(`user_${senderId}`).emit('message_sent', {
        conversationId,
        message,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('ChatGateway: Error broadcasting new message:', error);
    }
  }

  // Method to broadcast conversation updates
  async broadcastConversationUpdate(conversationId: string, update: any) {
    try {
      console.log('ChatGateway: Broadcasting conversation update:', conversationId);
      
      this.server.to(`conversation_${conversationId}`).emit('conversation_updated', {
        conversationId,
        update,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('ChatGateway: Error broadcasting conversation update:', error);
    }
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get online participants for a conversation
  async getOnlineParticipants(conversationId: string): Promise<string[]> {
    const onlineUserIds: string[] = [];
    
    for (const [socketId, user] of this.connectedUsers) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket && socket.rooms.has(`conversation_${conversationId}`)) {
        onlineUserIds.push(user.userId);
      }
    }
    
    return onlineUserIds;
  }
} 