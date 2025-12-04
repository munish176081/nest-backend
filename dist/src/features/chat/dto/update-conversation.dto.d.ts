export declare class UpdateConversationDto {
    subject?: string;
    isActive?: boolean;
    metadata?: {
        subject?: string;
        tags?: string[];
        priority?: 'low' | 'medium' | 'high';
    };
}
