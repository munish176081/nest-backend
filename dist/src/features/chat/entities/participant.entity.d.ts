import { Conversation } from './conversation.entity';
export declare enum ParticipantRole {
    BUYER = "buyer",
    SELLER = "seller",
    ADMIN = "admin"
}
export declare class Participant {
    id: string;
    conversation_id: string;
    user_id: string;
    name: string;
    avatar: string;
    role: ParticipantRole;
    isOnline: boolean;
    lastSeen: Date;
    unreadCount: number;
    createdAt: Date;
    updatedAt: Date;
    conversation: Conversation;
}
