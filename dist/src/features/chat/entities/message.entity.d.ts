import { Conversation } from './conversation.entity';
export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    FILE = "file",
    LISTING = "listing"
}
export declare class Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: MessageType;
    reply_to: string;
    attachments: {
        type: 'image' | 'file';
        url: string;
        name: string;
        size: number;
    }[];
    listing_reference: {
        listingId: string;
        title: string;
        price: number;
        image: string;
        location: string;
        fields?: Record<string, any>;
    };
    is_read: boolean;
    read_by: string[];
    timestamp: Date;
    replyToMessage: Message;
    conversation: Conversation;
}
