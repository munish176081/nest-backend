export declare class ParticipantDto {
    userId: string;
    name: string;
    avatar: string;
    role: 'buyer' | 'seller' | 'admin';
}
export declare class CreateConversationDto {
    participants: ParticipantDto[];
    listingId?: string;
    subject?: string;
    conversationType?: 'direct' | 'listing' | 'support';
}
