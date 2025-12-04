import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionService } from '../authentication/session.service';
import { UsersService } from '../accounts/users.service';
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly sessionService;
    private readonly usersService;
    server: Server;
    private connectedUsers;
    constructor(sessionService: SessionService, usersService: UsersService);
    afterInit(server: Server): void;
    handleMessageSent(payload: {
        conversationId: string;
        message: any;
        senderId: string;
        timestamp: Date;
    }): Promise<void>;
    handleConversationCreated(payload: {
        conversation: any;
        participants: any[];
        timestamp: Date;
    }): Promise<void>;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleJoinConversation(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
    handleLeaveConversation(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
    handleTyping(data: {
        conversationId: string;
        isTyping: boolean;
    }, client: Socket): Promise<void>;
    handleMarkRead(data: {
        conversationId: string;
        messageIds: string[];
    }, client: Socket): Promise<void>;
    handleRefreshConversationList(client: Socket): Promise<void>;
    handleCheckConversationStatus(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
    broadcastNewMessage(conversationId: string, message: any, senderId: string): Promise<void>;
    broadcastConversationCreated(conversation: any, participants: any[]): Promise<void>;
    notifyReceiverAboutNewMessage(conversationId: string, message: any, senderId: string): Promise<void>;
    broadcastConversationUpdate(conversationId: string, update: any): Promise<void>;
    getOnlineUsersCount(): number;
    getOnlineParticipants(conversationId: string): Promise<string[]>;
    getConversationParticipants(conversationId: string): Promise<string[]>;
    isUserInConversation(userId: string, conversationId: string): Promise<boolean>;
}
