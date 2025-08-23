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
import { OnEvent } from '@nestjs/event-emitter';
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
    // console.log('ChatGateway: WebSocket Gateway initialized');
  }

  // Listen for chat events from ChatService
  @OnEvent('chat.message.sent')
  async handleMessageSent(payload: {
    conversationId: string;
    message: any;
    senderId: string;
    timestamp: Date;
  }) {
    console.log('ChatGateway: Received chat.message.sent event debug new message:', payload);
    await this.broadcastNewMessage(payload.conversationId, payload.message, payload.senderId);
  }

  // Listen for new conversation creation events
  @OnEvent('chat.conversation.created')
  async handleConversationCreated(payload: {
    conversation: any;
    participants: any[];
    timestamp: Date;
  }) {
    console.log('ChatGateway: Received chat.conversation.created event:', {
      conversationId: payload.conversation.id,
      subject: payload.conversation.subject,
      participantCount: payload.participants.length,
      participants: payload.participants.map(p => ({ userId: p.userId, name: p.name }))
    });
    await this.broadcastConversationCreated(payload.conversation, payload.participants);
  }

  async handleConnection(client: Socket) {
    try {
      // console.log('ChatGateway: Client attempting to connect:', client.id);
      // console.log('ChatGateway: Handshake auth:', client.handshake.auth);
      // console.log('ChatGateway: Handshake headers:', client.handshake.headers);
      
      // Extract sessionId from handshake auth or headers
      let sessionId = client.handshake.auth.sessionId || 
                     client.handshake.headers.sessionid ||
                     client.handshake.headers['x-session-id'];
      
      // If no sessionId in auth, try to extract from cookies
      if (!sessionId && client.handshake.headers.cookie) {
        // console.log('ChatGateway: Checking cookies for session ID');
        const cookies = client.handshake.headers.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          
          // Check for both 'token' and 'connect.sid' cookies
          if (name === 'token' || name === 'connect.sid') {
            sessionId = decodeURIComponent(value); // Decode URL encoded value
            break;
          }
        }
      }
      
             // Remove the 's:' prefix from session ID regardless of source
       if (sessionId && sessionId.startsWith('s:')) {
         sessionId = sessionId.substring(2); // Remove the 's:' prefix
         // console.log('ChatGateway: Removed s: prefix from session ID');
       }
       
       // Remove the signature part (everything after the dot) from session ID
       if (sessionId && sessionId.includes('.')) {
         sessionId = sessionId.split('.')[0]; // Keep only the part before the dot
         // console.log('ChatGateway: Removed signature from session ID');
       }
      
      // console.log('ChatGateway: Extracted sessionId:', sessionId);
      
      // TEMPORARY: Allow test connections for debugging
      if (sessionId && sessionId.startsWith('test-session-')) {
        // console.log('ChatGateway: Allowing test connection with session ID:', sessionId);
        
        // Create a consistent mock user for testing based on sessionId
        const mockUser = {
          id: sessionId, // Use sessionId as consistent user ID
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
        // console.log('ChatGateway: No sessionId provided, disconnecting client');
        client.disconnect();
        return;
      }

      // Verify session and get user
      // console.log('ChatGateway: Verifying session with ID:', sessionId);
      const session = await this.sessionService.verifySession(sessionId);
      // console.log('ChatGateway: Session verification result:', session);
      
      // TEMPORARY: Allow connection if session verification fails (for development)
      if (!session) {
        // console.log('ChatGateway: Session verification failed, but allowing connection for development');
        
        // Create a consistent development user based on sessionId
        const tempUser = {
          id: sessionId || 'dev-user-' + client.id, // Use sessionId if available, otherwise socket ID
          username: 'dev-user',
          email: 'dev@example.com'
        };
        
        // Store connected user
        this.connectedUsers.set(client.id, {
          socketId: client.id,
          userId: tempUser.id,
          user: tempUser,
        });

        // Join user to their personal room
        await client.join(`user_${tempUser.id}`);
        
        // console.log('ChatGateway: Development client connected successfully:', {
        //   socketId: client.id,
        //   userId: tempUser.id,
        //   username: tempUser.username,
        // // });

        // Broadcast user online status to all connected clients
        this.server.emit('user_status_changed', {
          userId: tempUser.id,
          isOnline: true,
          lastSeen: new Date(),
        });
        
        return;
      }
      
      // console.log('ChatGateway: Session verified, user data:', session);

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
    console.log('ChatGateway: join_conversation received:', data, 'from client:', client.id);
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      console.log('ChatGateway: Connected user for join_conversation:', connectedUser);
      if (!connectedUser) {
        console.log('ChatGateway: User not authenticated for join_conversation');
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { conversationId } = data;
      
      // Check if user is already in this conversation room
      const roomName = `conversation_${conversationId}`;
      const isAlreadyInRoom = client.rooms.has(roomName);
      
      if (isAlreadyInRoom) {
        console.log('ChatGateway: User already in conversation room:', {
          userId: connectedUser.userId,
          conversationId,
          socketId: client.id,
        });
        client.emit('joined_conversation', { conversationId });
        return;
      }

      // Join new conversation room (without leaving others)
      await client.join(roomName);
      
      console.log('ChatGateway: User joined conversation room:', {
        userId: connectedUser.userId,
        conversationId,
        socketId: client.id,
        totalRooms: Array.from(client.rooms).filter(room => room.startsWith('conversation_')).length
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

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      if (!connectedUser) return;

      const { conversationId, isTyping } = data;

      // Broadcast typing indicator to conversation room (excluding sender)
      client.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId: connectedUser.userId,
        username: connectedUser.user.username,
        isTyping,
      });
    } catch (error) {
      console.error('ChatGateway: Error handling typing event:', error);
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

  @SubscribeMessage('refresh_conversation_list')
  async handleRefreshConversationList(
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      if (!connectedUser) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      console.log('ChatGateway: User requested conversation list refresh:', {
        userId: connectedUser.userId,
        socketId: client.id,
      });

      // Acknowledge the refresh request
      client.emit('conversation_list_refresh_requested', {
        userId: connectedUser.userId,
        timestamp: new Date(),
        message: 'Please call your API to refresh the conversation list'
      });

    } catch (error) {
      console.error('ChatGateway: Error handling refresh conversation list:', error);
      client.emit('error', { message: 'Failed to process refresh request' });
    }
  }

  @SubscribeMessage('check_conversation_status')
  async handleCheckConversationStatus(
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
      
      console.log('ChatGateway: User checking conversation status:', {
        userId: connectedUser.userId,
        conversationId,
        socketId: client.id,
      });

      // Check if user is in the conversation room
      const roomName = `conversation_${conversationId}`;
      const isInRoom = client.rooms.has(roomName);
      
      // Check if there are other participants online
      const onlineParticipants = await this.getOnlineParticipants(conversationId);
      const otherOnlineParticipants = onlineParticipants.filter(id => id !== connectedUser.userId);

      client.emit('conversation_status', {
        conversationId,
        userId: connectedUser.userId,
        isInRoom,
        onlineParticipants: otherOnlineParticipants,
        timestamp: new Date(),
        message: isInRoom ? 'You are in the conversation room' : 'You are not in the conversation room'
      });

    } catch (error) {
      console.error('ChatGateway: Error checking conversation status:', error);
      client.emit('error', { message: 'Failed to check conversation status' });
    }
  }

  // Method to broadcast new message to conversation participants
  async broadcastNewMessage(conversationId: string, message: any, senderId: string) {
    console.log('ChatGateway: Broadcasting new message debug new message:', {
      conversationId,
      message,
      senderId,
    });
    try {
      const roomName = `conversation_${conversationId}`;
      console.log('ChatGateway: Broadcasting new message to conversation:', conversationId);
      
      // Get all sockets in the conversation room for debugging
      const socketsInRoom = await this.server.in(roomName).fetchSockets();
      console.log('ChatGateway: Sockets in room', roomName, ':', socketsInRoom.length);
      socketsInRoom.forEach((socket, index) => {
        console.log(`ChatGateway: Socket ${index + 1}:`, socket.id);
      });
      
      // Broadcast to conversation room (excluding sender)
      this.server.to(roomName).emit('new_message', {
        conversationId,
        message,
        senderId,
        timestamp: new Date(),
      });
      
      console.log('ChatGateway: new_message event emitted to room:', roomName);

      // Also emit to sender for confirmation
      this.server.to(`user_${senderId}`).emit('message_sent', {
        conversationId,
        message,
        timestamp: new Date(),
      });

      // Send specific notification to receiver(s) about new message received
      await this.notifyReceiverAboutNewMessage(conversationId, message, senderId);

    } catch (error) {
      console.error('ChatGateway: Error broadcasting new message:', error);
    }
  }

  // Method to broadcast new conversation creation to all participants
  async broadcastConversationCreated(conversation: any, participants: any[]) {
    console.log('ChatGateway: Broadcasting conversation created:', conversation.id);
    console.log('ChatGateway: Current connected users:', Array.from(this.connectedUsers.values()).map(u => ({ socketId: u.socketId, userId: u.userId })));
    try {
      // Create the conversation event data
      const conversationEventData = {
        conversation: {
          id: conversation.id,
          subject: conversation.subject,
          conversationType: conversation.conversation_type,
          listingId: conversation.listing_id,
          isActive: conversation.isActive,
          unreadCount: 0, // New conversation starts with 0 unread
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          participants: participants.map(p => ({
            user_id: p.userId,
            name: p.name,
            avatar: p.avatar,
            role: p.role,
            isOnline: false, // Will be updated when user connects
            lastSeen: new Date(),
          })),
          lastMessage: conversation.lastMessage, // Include the actual last message
          listing: conversation.listing,
        },
        participantUserIds: participants.map(p => p.userId), // Include participant user IDs
        timestamp: new Date(),
      };

      // Emit to ALL connected clients - let frontend filter by user ID
      console.log('ChatGateway: Emitting conversation_created event to all connected clients');
      console.log('ChatGateway: Participant user IDs:', conversationEventData.participantUserIds);
      this.server.emit('conversation_created', conversationEventData);
      
      console.log('ChatGateway: conversation_created event emitted to all connected clients');
    } catch (error) {
      console.error('ChatGateway: Error broadcasting conversation created:', error);
    }
  }

  // Method to notify receiver about new message and suggest refreshing conversation list
  async notifyReceiverAboutNewMessage(conversationId: string, message: any, senderId: string) {
    console.log('ChatGateway: Notifying receiver about new message debug new message:', {
      conversationId,
      message,
      senderId,
    });
    try {
      console.log('ChatGateway: Notifying receiver about new message:', {
        conversationId,
        senderId,
        messageId: message.id
      });

      // Get all participants in the conversation room
      const roomName = `conversation_${conversationId}`;
      const socketsInRoom = await this.server.in(roomName).fetchSockets();
      
      // Find the receiver(s) - exclude the sender
      const receiverSockets = socketsInRoom.filter(socket => {
        const connectedUser = this.connectedUsers.get(socket.id);
        return connectedUser && connectedUser.userId !== senderId;
      });

      console.log('ChatGateway: Found receiver sockets:', receiverSockets.length);

      // Send "new_message_received" event to each receiver
      receiverSockets.forEach(socket => {
        const connectedUser = this.connectedUsers.get(socket.id);
        if (connectedUser) {
          console.log('ChatGateway: Sending new_message_received to user:', connectedUser.userId);
          
          socket.emit('new_message_received', {
            conversationId,
            message: {
              id: message.id,
              content: message.content,
              senderId: message.senderId,
              timestamp: message.timestamp,
              // Include minimal message data to help identify the conversation
            },
            sender: {
              id: message.senderId,
              username: message.sender?.username || 'Unknown User',
              // Add other sender details if available
            },
            action: 'refresh_conversation_list', // Suggests the frontend to refresh
            timestamp: new Date(),
          });
        }
      });

      // Also send to users who might be online but not currently in the conversation room
      // This helps notify users who are online but haven't opened the specific conversation
      for (const [socketId, connectedUser] of this.connectedUsers) {
        if (connectedUser.userId !== senderId) {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket && !socket.rooms.has(roomName)) {
            // Check if this user should be notified about this conversation
            // You might want to add logic here to check if user is part of this conversation
            console.log('ChatGateway: Sending new_message_received to online user not in room:', connectedUser.userId);
            
            socket.emit('new_message_received', {
              conversationId,
              message: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                timestamp: message.timestamp,
              },
              sender: {
                id: message.senderId,
                username: message.sender?.username || 'Unknown User',
              },
              action: 'refresh_conversation_list',
              timestamp: new Date(),
            });
          }
        }
      }

    } catch (error) {
      console.error('ChatGateway: Error notifying receiver about new message:', error);
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

  // Get all participants for a conversation (both online and offline)
  async getConversationParticipants(conversationId: string): Promise<string[]> {
    // This method would typically call your chat service to get conversation participants
    // For now, we'll return online participants, but you can enhance this
    return await this.getOnlineParticipants(conversationId);
  }

  // Check if a user is part of a conversation
  async isUserInConversation(userId: string, conversationId: string): Promise<boolean> {
    // This method would typically call your chat service to verify user participation
    // For now, we'll check if they're online and in the room
    for (const [socketId, user] of this.connectedUsers) {
      if (user.userId === userId) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket && socket.rooms.has(`conversation_${conversationId}`)) {
          return true;
        }
      }
    }
    return false;
  }
} 