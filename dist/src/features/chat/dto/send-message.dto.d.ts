export declare class AttachmentDto {
    type: 'image' | 'file';
    url: string;
    name: string;
    size: number;
}
export declare class SendMessageDto {
    content: string;
    messageType: 'text' | 'image' | 'file' | 'listing';
    replyTo?: string;
    attachments?: AttachmentDto[];
    listingReference?: {
        listingId: string;
        title: string;
        price: number;
        image: string;
        location: string;
        breed?: string;
        fields?: Record<string, any>;
    };
}
