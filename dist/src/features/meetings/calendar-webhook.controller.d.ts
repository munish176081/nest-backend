import { MeetingsService } from './meetings.service';
import { OAuthCalendarService } from './oauth-calendar.service';
interface GoogleCalendarWebhookPayload {
    kind: string;
    etag: string;
    id: string;
    resourceId: string;
    resourceUri: string;
    token?: string;
    expiration?: string;
}
interface CalendarEventUpdate {
    eventId: string;
    calendarId: string;
    eventType: 'cancelled' | 'updated' | 'created';
    summary?: string;
    start?: {
        dateTime: string;
        timeZone: string;
    };
    end?: {
        dateTime: string;
        timeZone: string;
    };
    status?: string;
    attendees?: Array<{
        email: string;
        responseStatus: string;
    }>;
}
export declare class CalendarWebhookController {
    private readonly meetingsService;
    private readonly oauthCalendarService;
    private readonly logger;
    constructor(meetingsService: MeetingsService, oauthCalendarService: OAuthCalendarService);
    handleGoogleCalendarWebhook(headers: Record<string, string>, payload: GoogleCalendarWebhookPayload): Promise<{
        success: boolean;
        message: string;
    }>;
    testEventUpdate(eventUpdate: CalendarEventUpdate): Promise<any>;
    testConfirmMeeting(body: {
        meetingId: string;
    }): Promise<any>;
    private verifyWebhookSignature;
    private processCalendarNotification;
    private parseResourceUri;
    private fetchEventDetails;
    private handleCalendarEventUpdate;
    private handleMeetingCancellation;
    private handleMeetingReschedule;
    private handleAttendeeResponseChanges;
}
export {};
