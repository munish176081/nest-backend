import { Participant } from './participant.entity';
import { Message } from './message.entity';
import { Listing } from '../../listings/entities/listing.entity';
export declare enum ConversationType {
    DIRECT = "direct",
    LISTING = "listing",
    SUPPORT = "support"
}
export declare class Conversation {
    id: string;
    subject: string;
    conversation_type: ConversationType;
    isActive: boolean;
    unreadCount: number;
    listing_id: string;
    metadata: {
        subject?: string;
        tags?: string[];
        priority?: 'low' | 'medium' | 'high';
        listingDetails?: {
            id: string;
            title: string;
            price: number;
            location: string;
            breed: string;
            fields?: Record<string, any>;
        };
        participants?: {
            buyer?: {
                id: string;
                name: string;
                joinedPlatform: string | Date;
            };
            seller?: {
                id: string;
                name: string;
                joinedPlatform: string | Date;
            };
        };
    };
    createdAt: Date;
    updatedAt: Date;
    participants: Participant[];
    messages: Message[];
    lastMessage: Message;
    listing: Listing;
}
