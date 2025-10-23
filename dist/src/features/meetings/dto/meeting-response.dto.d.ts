export declare class MeetingResponseDto {
    id: string;
    listingId: string;
    listingTitle: string;
    listingType: string;
    buyerId: string;
    buyerName: string;
    buyerEmail: string;
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    date: string;
    time: string;
    duration: number;
    timezone: string;
    status: string;
    googleMeetLink?: string;
    calendarEventId?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
