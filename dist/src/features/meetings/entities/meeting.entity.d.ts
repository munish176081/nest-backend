export declare class Meeting {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
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
