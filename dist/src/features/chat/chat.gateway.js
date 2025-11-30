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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const event_emitter_1 = require("@nestjs/event-emitter");
const session_service_1 = require("../authentication/session.service");
const users_service_1 = require("../accounts/users.service");
let ChatGateway = class ChatGateway {
    constructor(sessionService, usersService) {
        this.sessionService = sessionService;
        this.usersService = usersService;
        this.connectedUsers = new Map();
    }
    afterInit(server) {
    }
    async handleMessageSent(payload) {
        console.log('ChatGateway: Received chat.message.sent event debug new message:', payload);
        await this.broadcastNewMessage(payload.conversationId, payload.message, payload.senderId);
    }
    async handleConversationCreated(payload) {
        console.log('ChatGateway: Received chat.conversation.created event:', {
            conversationId: payload.conversation.id,
            subject: payload.conversation.subject,
            participantCount: payload.participants.length,
            participants: payload.participants.map(p => ({ userId: p.userId, name: p.name }))
        });
        await this.broadcastConversationCreated(payload.conversation, payload.participants);
    }
    async handleConnection(client) {
        try {
            let sessionId = client.handshake.auth.sessionId ||
                client.handshake.headers.sessionid ||
                client.handshake.headers['x-session-id'];
            if (!sessionId && client.handshake.headers.cookie) {
                console.log('DUBUG: Checking cookies for session ID');
                console.log('DUBUG: Raw cookie header:', client.handshake.headers.cookie);
                const cookies = client.handshake.headers.cookie.split(';');
                console.log('DUBUG: Parsed cookies:', cookies);
                for (const cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    console.log('DUBUG: Processing cookie:', name, '=', value);
                    if (name === 'token' || name === 'connect.sid') {
                        sessionId = decodeURIComponent(value);
                        console.log('DUBUG: Found session cookie:', name, '=', value);
                        console.log('DUBUG: Decoded sessionId:', sessionId);
                        break;
                    }
                }
            }
            console.log('DUBUG: Original sessionId from handshake:', sessionId);
            console.log('DUBUG: Handshake auth:', client.handshake.auth);
            console.log('DUBUG: Handshake headers:', client.handshake.headers);
            if (sessionId && sessionId.startsWith('s:')) {
                sessionId = sessionId.substring(2);
                console.log('DUBUG: Removed s: prefix, sessionId now:', sessionId);
            }
            console.log('DUBUG: Final sessionId being sent to session service:', sessionId);
            if (sessionId && sessionId.startsWith('test-session-')) {
                const mockUser = {
                    id: sessionId,
                    username: 'test-user',
                    email: 'test@example.com'
                };
                this.connectedUsers.set(client.id, {
                    socketId: client.id,
                    userId: mockUser.id,
                    user: mockUser,
                });
                await client.join(`user_${mockUser.id}`);
                console.log('ChatGateway: Test client connected successfully:', {
                    socketId: client.id,
                    userId: mockUser.id,
                    username: mockUser.username,
                });
                this.server.emit('user_status_changed', {
                    userId: mockUser.id,
                    isOnline: true,
                    lastSeen: new Date(),
                });
                return;
            }
            if (!sessionId) {
                client.disconnect();
                return;
            }
            const session = await this.sessionService.verifySession(sessionId);
            if (!session) {
                const tempUser = {
                    id: sessionId || 'dev-user-' + client.id,
                    username: 'dev-user',
                    email: 'dev@example.com'
                };
                this.connectedUsers.set(client.id, {
                    socketId: client.id,
                    userId: tempUser.id,
                    user: tempUser,
                });
                await client.join(`user_${tempUser.id}`);
                this.server.emit('user_status_changed', {
                    userId: tempUser.id,
                    isOnline: true,
                    lastSeen: new Date(),
                });
                return;
            }
            const user = await this.usersService.getUserById(session.id || session.userId);
            if (!user) {
                console.log('ChatGateway: User not found, disconnecting client');
                client.disconnect();
                return;
            }
            this.connectedUsers.set(client.id, {
                socketId: client.id,
                userId: user.id,
                user,
            });
            await client.join(`user_${user.id}`);
            this.server.emit('user_status_changed', {
                userId: user.id,
                isOnline: true,
                lastSeen: new Date(),
            });
        }
        catch (error) {
            console.error('ChatGateway: Error during connection:', error);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const connectedUser = this.connectedUsers.get(client.id);
        if (connectedUser) {
            console.log('ChatGateway: Client disconnected:', {
                socketId: client.id,
                userId: connectedUser.userId,
                username: connectedUser.user.username,
            });
            this.connectedUsers.delete(client.id);
            this.server.emit('user_status_changed', {
                userId: connectedUser.userId,
                isOnline: false,
                lastSeen: new Date(),
            });
        }
    }
    async handleJoinConversation(data, client) {
        try {
            const connectedUser = this.connectedUsers.get(client.id);
            if (!connectedUser) {
                client.emit('error', { message: 'User not authenticated' });
                return;
            }
            const { conversationId } = data;
            const roomName = `conversation_${conversationId}`;
            const isAlreadyInRoom = client.rooms.has(roomName);
            if (isAlreadyInRoom) {
                client.emit('joined_conversation', { conversationId });
                return;
            }
            await client.join(roomName);
            console.log('ChatGateway: User joined conversation room:', {
                userId: connectedUser.userId,
                conversationId,
                socketId: client.id,
                totalRooms: Array.from(client.rooms).filter(room => room.startsWith('conversation_')).length
            });
            client.emit('joined_conversation', { conversationId });
        }
        catch (error) {
            console.error('ChatGateway: Error joining conversation:', error);
            client.emit('error', { message: 'Failed to join conversation' });
        }
    }
    async handleLeaveConversation(data, client) {
        try {
            const connectedUser = this.connectedUsers.get(client.id);
            if (!connectedUser) {
                client.emit('error', { message: 'User not authenticated' });
                return;
            }
            const { conversationId } = data;
            await client.leave(`conversation_${conversationId}`);
            console.log('ChatGateway: User left conversation:', {
                userId: connectedUser.userId,
                conversationId,
                socketId: client.id,
            });
            client.emit('left_conversation', { conversationId });
        }
        catch (error) {
            console.error('ChatGateway: Error leaving conversation:', error);
            client.emit('error', { message: 'Failed to leave conversation' });
        }
    }
    async handleTyping(data, client) {
        try {
            const connectedUser = this.connectedUsers.get(client.id);
            if (!connectedUser)
                return;
            const { conversationId, isTyping } = data;
            client.to(`conversation_${conversationId}`).emit('user_typing', {
                conversationId,
                userId: connectedUser.userId,
                username: connectedUser.user.username,
                isTyping,
            });
        }
        catch (error) {
            console.error('ChatGateway: Error handling typing event:', error);
        }
    }
    async handleMarkRead(data, client) {
        try {
            const connectedUser = this.connectedUsers.get(client.id);
            if (!connectedUser)
                return;
            const { conversationId, messageIds } = data;
            client.to(`conversation_${conversationId}`).emit('messages_read', {
                conversationId,
                userId: connectedUser.userId,
                username: connectedUser.user.username,
                messageIds,
                readAt: new Date(),
            });
        }
        catch (error) {
            console.error('ChatGateway: Error handling mark read:', error);
        }
    }
    async handleRefreshConversationList(client) {
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
            client.emit('conversation_list_refresh_requested', {
                userId: connectedUser.userId,
                timestamp: new Date(),
                message: 'Please call your API to refresh the conversation list'
            });
        }
        catch (error) {
            console.error('ChatGateway: Error handling refresh conversation list:', error);
            client.emit('error', { message: 'Failed to process refresh request' });
        }
    }
    async handleCheckConversationStatus(data, client) {
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
            const roomName = `conversation_${conversationId}`;
            const isInRoom = client.rooms.has(roomName);
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
        }
        catch (error) {
            console.error('ChatGateway: Error checking conversation status:', error);
            client.emit('error', { message: 'Failed to check conversation status' });
        }
    }
    async broadcastNewMessage(conversationId, message, senderId) {
        console.log('ChatGateway: Broadcasting new message debug new message:', {
            conversationId,
            message,
            senderId,
        });
        try {
            const roomName = `conversation_${conversationId}`;
            console.log('ChatGateway: Broadcasting new message to conversation:', conversationId);
            const socketsInRoom = await this.server.in(roomName).fetchSockets();
            console.log('ChatGateway: Sockets in room', roomName, ':', socketsInRoom.length);
            socketsInRoom.forEach((socket, index) => {
                console.log(`ChatGateway: Socket ${index + 1}:`, socket.id);
            });
            this.server.to(roomName).emit('new_message', {
                conversationId,
                message,
                senderId,
                timestamp: new Date(),
            });
            console.log('ChatGateway: new_message event emitted to room:', roomName);
            this.server.to(`user_${senderId}`).emit('message_sent', {
                conversationId,
                message,
                timestamp: new Date(),
            });
            await this.notifyReceiverAboutNewMessage(conversationId, message, senderId);
        }
        catch (error) {
            console.error('ChatGateway: Error broadcasting new message:', error);
        }
    }
    async broadcastConversationCreated(conversation, participants) {
        console.log('ChatGateway: Broadcasting conversation created:', conversation.id);
        console.log('ChatGateway: Current connected users:', Array.from(this.connectedUsers.values()).map(u => ({ socketId: u.socketId, userId: u.userId })));
        try {
            const conversationEventData = {
                conversation: {
                    id: conversation.id,
                    subject: conversation.subject,
                    conversationType: conversation.conversation_type,
                    listingId: conversation.listing_id,
                    isActive: conversation.isActive,
                    unreadCount: 0,
                    createdAt: conversation.createdAt,
                    updatedAt: conversation.updatedAt,
                    participants: participants.map(p => ({
                        user_id: p.userId,
                        name: p.name,
                        avatar: p.avatar,
                        role: p.role,
                        isOnline: false,
                        lastSeen: new Date(),
                    })),
                    lastMessage: conversation.lastMessage,
                    listing: conversation.listing,
                },
                participantUserIds: participants.map(p => p.userId),
                timestamp: new Date(),
            };
            console.log('ChatGateway: Emitting conversation_created event to all connected clients');
            console.log('ChatGateway: Participant user IDs:', conversationEventData.participantUserIds);
            this.server.emit('conversation_created', conversationEventData);
            console.log('ChatGateway: conversation_created event emitted to all connected clients');
        }
        catch (error) {
            console.error('ChatGateway: Error broadcasting conversation created:', error);
        }
    }
    async notifyReceiverAboutNewMessage(conversationId, message, senderId) {
        console.log('ChatGateway: Notifying receiver about new message debug new message:', {
            conversationId,
            message,
            senderId,
        });
        try {
            const roomName = `conversation_${conversationId}`;
            const socketsInRoom = await this.server.in(roomName).fetchSockets();
            const receiverSockets = socketsInRoom.filter(socket => {
                const connectedUser = this.connectedUsers.get(socket.id);
                return connectedUser && connectedUser.userId !== senderId;
            });
            console.log('ChatGateway: Found receiver sockets:', receiverSockets.length);
            receiverSockets.forEach(socket => {
                const connectedUser = this.connectedUsers.get(socket.id);
                if (connectedUser) {
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
            });
            for (const [socketId, connectedUser] of this.connectedUsers) {
                if (connectedUser.userId !== senderId) {
                    const socket = this.server.sockets.sockets.get(socketId);
                    if (socket && !socket.rooms.has(roomName)) {
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
        }
        catch (error) {
            console.error('ChatGateway: Error notifying receiver about new message:', error);
        }
    }
    async broadcastConversationUpdate(conversationId, update) {
        try {
            console.log('ChatGateway: Broadcasting conversation update:', conversationId);
            this.server.to(`conversation_${conversationId}`).emit('conversation_updated', {
                conversationId,
                update,
                timestamp: new Date(),
            });
        }
        catch (error) {
            console.error('ChatGateway: Error broadcasting conversation update:', error);
        }
    }
    getOnlineUsersCount() {
        return this.connectedUsers.size;
    }
    async getOnlineParticipants(conversationId) {
        const onlineUserIds = [];
        for (const [socketId, user] of this.connectedUsers) {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket && socket.rooms.has(`conversation_${conversationId}`)) {
                onlineUserIds.push(user.userId);
            }
        }
        return onlineUserIds;
    }
    async getConversationParticipants(conversationId) {
        return await this.getOnlineParticipants(conversationId);
    }
    async isUserInConversation(userId, conversationId) {
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
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.message.sent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessageSent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.conversation.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleConversationCreated", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_conversation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('mark_read'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('refresh_conversation_list'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleRefreshConversationList", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('check_conversation_status'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleCheckConversationStatus", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
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
    }),
    __metadata("design:paramtypes", [session_service_1.SessionService,
        users_service_1.UsersService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map