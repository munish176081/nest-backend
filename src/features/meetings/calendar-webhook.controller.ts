import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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

@Controller('calendar/webhook')
export class CalendarWebhookController {
  private readonly logger = new Logger(CalendarWebhookController.name);

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly oauthCalendarService: OAuthCalendarService,
  ) {}

  /**
   * 🔔 Handle Google Calendar webhook notifications
   * This endpoint receives real-time updates when calendar events change
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async handleGoogleCalendarWebhook(
    @Headers() headers: Record<string, string>,
    @Body() payload: GoogleCalendarWebhookPayload,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('📨 Received Google Calendar webhook', {
      resourceId: payload.resourceId,
      kind: payload.kind,
    });

    try {
      // Verify webhook authenticity
      this.verifyWebhookSignature(headers, payload);

      // Handle different types of calendar notifications
      await this.processCalendarNotification(payload);

      return {
        success: true,
        message: 'Webhook processed successfully'
      };

    } catch (error) {
      this.logger.error('❌ Error processing calendar webhook:', error);
      
      // Return success to prevent Google from retrying invalid webhooks
      if (error instanceof BadRequestException) {
        return {
          success: false,
          message: error.message
        };
      }

      throw error;
    }
  }

  /**
   * 🔔 Manual webhook for testing calendar event updates
   */
  @Post('test-event-update')
  async testEventUpdate(@Body() eventUpdate: CalendarEventUpdate): Promise<any> {
    this.logger.log('🧪 Processing test calendar event update', eventUpdate);

    try {
      await this.handleCalendarEventUpdate(eventUpdate);
      return { success: true, message: 'Test event update processed' };
    } catch (error) {
      this.logger.error('❌ Error processing test event update:', error);
      throw error;
    }
  }

  /**
   * 🧪 Test endpoint to manually confirm a meeting (for testing webhook functionality)
   */
  @Post('test-confirm-meeting')
  async testConfirmMeeting(@Body() body: { meetingId: string }): Promise<any> {
    this.logger.log('🧪 Testing meeting confirmation for meeting:', body);

    // Validate request body
    if (!body || !body.meetingId) {
      throw new BadRequestException('Request body must contain meetingId');
    }

    try {
      const meeting = await this.meetingsService.findById(body.meetingId);
      if (!meeting) {
        throw new BadRequestException(`Meeting not found with ID: ${body.meetingId}`);
      }

      if (meeting.status !== 'pending') {
        throw new BadRequestException(`Meeting is not pending (current status: ${meeting.status})`);
      }

      this.logger.log(`📝 Found meeting: ${meeting.id} with status: ${meeting.status}`);

      // Directly process attendee response changes for testing
      const mockAttendees = [
        { email: 'seller@example.com', responseStatus: 'accepted' },
        { email: 'buyer@example.com', responseStatus: 'accepted' }
      ];

      await this.handleAttendeeResponseChanges(meeting.id, mockAttendees);
      
      // Fetch updated meeting to confirm status change
      const updatedMeeting = await this.meetingsService.findById(body.meetingId);
      
      return { 
        success: true, 
        message: 'Meeting confirmed via test webhook',
        meetingId: body.meetingId,
        oldStatus: meeting.status,
        newStatus: updatedMeeting?.status || 'unknown',
        meeting: updatedMeeting
      };
    } catch (error) {
      this.logger.error('❌ Error in test confirm meeting:', error);
      throw error;
    }
  }

  /**
   * 🔐 Verify webhook signature (basic implementation)
   */
  private verifyWebhookSignature(headers: Record<string, string>, payload: any): void {
    // Basic verification - in production, implement proper signature verification
    const channelId = headers['x-goog-channel-id'];
    const channelToken = headers['x-goog-channel-token'];

    if (!channelId || !channelToken) {
      throw new BadRequestException('Missing required webhook headers');
    }

    this.logger.debug('🔐 Webhook verification passed', {
      channelId: channelId.substring(0, 8) + '...',
      hasToken: !!channelToken
    });
  }

  /**
   * 📬 Process different types of calendar notifications
   */
  private async processCalendarNotification(payload: GoogleCalendarWebhookPayload): Promise<void> {
    // For now, we'll fetch the updated event details
    // In a real implementation, you'd parse the specific changes
    
    this.logger.log('📬 Processing calendar notification', {
      resourceId: payload.resourceId,
      resourceUri: payload.resourceUri
    });

    // Extract calendar ID and event ID from the resource URI
    const { calendarId, eventId } = this.parseResourceUri(payload.resourceUri);
    
    if (eventId) {
      // Fetch the current state of the event
      const eventUpdate = await this.fetchEventDetails(calendarId, eventId);
      
      if (eventUpdate) {
        await this.handleCalendarEventUpdate(eventUpdate);
      }
    }
  }

  /**
   * 📋 Parse Google Calendar resource URI to extract IDs
   */
  private parseResourceUri(resourceUri: string): { calendarId: string; eventId?: string } {
    // Example URI: https://www.googleapis.com/calendar/v3/calendars/primary/events?alt=json
    // or: https://www.googleapis.com/calendar/v3/calendars/primary/events/eventId123
    
    const match = resourceUri.match(/calendars\/([^\/]+)\/events(?:\/([^?]+))?/);
    
    return {
      calendarId: match?.[1] || 'primary',
      eventId: match?.[2] || undefined
    };
  }

  /**
   * 📅 Fetch event details from Google Calendar
   */
  private async fetchEventDetails(calendarId: string, eventId: string): Promise<CalendarEventUpdate | null> {
    try {
      this.logger.log(`📅 Fetching event ${eventId} from calendar ${calendarId}`);
      
      // Find the user who owns this calendar event
      const meeting = await this.meetingsService.findByCalendarEventId(eventId);
      if (!meeting) {
        this.logger.log('📝 No meeting found for calendar event ID:', eventId);
        return null;
      }

      // Get the user's calendar tokens (using public method)
      const userTokens = await this.meetingsService.getUserCalendarTokens(meeting.sellerId);
      if (!userTokens?.access_token) {
        this.logger.log('🔑 No access token found for user:', meeting.sellerId);
        return null;
      }

      // Fetch the actual event from Google Calendar
      const calendarEvent = await this.oauthCalendarService.getCalendarEvent(
        userTokens.access_token,
        calendarId,
        eventId
      );

      if (!calendarEvent) {
        this.logger.log('📅 No calendar event found');
        return null;
      }

      // Transform Google Calendar event to our format
      const eventUpdate: CalendarEventUpdate = {
        eventId: eventId,
        calendarId: calendarId,
        eventType: 'updated', // Default to updated
        summary: calendarEvent.summary,
        start: calendarEvent.start,
        end: calendarEvent.end,
        status: calendarEvent.status,
        attendees: calendarEvent.attendees?.map(attendee => ({
          email: attendee.email,
          responseStatus: attendee.responseStatus || 'needsAction'
        }))
      };

      this.logger.log('📅 Fetched calendar event:', {
        eventId,
        summary: eventUpdate.summary,
        status: eventUpdate.status,
        attendees: eventUpdate.attendees
      });

      return eventUpdate;
      
    } catch (error) {
      this.logger.error('❌ Error fetching event details:', error);
      return null;
    }
  }

  /**
   * 🔄 Handle calendar event updates and sync with meetings
   */
  private async handleCalendarEventUpdate(eventUpdate: CalendarEventUpdate): Promise<void> {
    this.logger.log('🔄 Handling calendar event update', {
      eventId: eventUpdate.eventId,
      eventType: eventUpdate.eventType,
      status: eventUpdate.status
    });

    try {
      // Find meeting by calendar event ID
      const meeting = await this.meetingsService.findByCalendarEventId(eventUpdate.eventId);
      
      if (!meeting) {
        this.logger.log('📝 No meeting found for calendar event ID:', eventUpdate.eventId);
        return;
      }

      // Handle different types of updates
      switch (eventUpdate.eventType) {
        case 'cancelled':
          await this.handleMeetingCancellation(meeting.id, eventUpdate);
          break;
          
        case 'updated':
          await this.handleMeetingReschedule(meeting.id, eventUpdate);
          break;
          
        default:
          this.logger.log('🤷 Unhandled event type:', eventUpdate.eventType);
      }

      // Also check for attendee response status changes
      if (eventUpdate.attendees) {
        await this.handleAttendeeResponseChanges(meeting.id, eventUpdate.attendees);
      }

    } catch (error) {
      this.logger.error('❌ Error handling calendar event update:', error);
      throw error;
    }
  }

  /**
   * ❌ Handle meeting cancellation from calendar
   */
  private async handleMeetingCancellation(meetingId: string, eventUpdate: CalendarEventUpdate): Promise<void> {
    this.logger.log(`❌ Processing meeting cancellation for meeting ${meetingId}`);
    
    // Update meeting status to cancelled
    await this.meetingsService.updateMeetingStatus(
      meetingId,
      'cancelled_by_user',
      'Cancelled via Google Calendar'
    );

    // TODO: Send notifications to participants
    this.logger.log('📧 Would send cancellation notifications to participants');
  }

  /**
   * 📅 Handle meeting reschedule from calendar
   */
  private async handleMeetingReschedule(meetingId: string, eventUpdate: CalendarEventUpdate): Promise<void> {
    this.logger.log(`📅 Processing meeting reschedule for meeting ${meetingId}`);

    if (eventUpdate.start?.dateTime && eventUpdate.end?.dateTime) {
      const startDate = new Date(eventUpdate.start.dateTime);
      const newDate = startDate.toISOString().split('T')[0];
      const newTime = startDate.toTimeString().split(' ')[0].substring(0, 5);

      // Update meeting with new time
      await this.meetingsService.updateMeetingDateTime(meetingId, newDate, newTime);

      // TODO: Send notifications about reschedule
      this.logger.log('📧 Would send reschedule notifications to participants');
    }
  }

  /**
   * ✅ Handle attendee response status changes (accept/decline)
   */
  private async handleAttendeeResponseChanges(meetingId: string, attendees: Array<{ email: string; responseStatus: string }>): Promise<void> {
    this.logger.log(`👥 Processing attendee response changes for meeting ${meetingId}`);

    try {
      // Find the meeting
      const meeting = await this.meetingsService.findById(meetingId);
      if (!meeting) {
        this.logger.log('📝 Meeting not found for attendee response processing');
        return;
      }

      // For now, we'll use a simple approach: if any attendee accepts, consider it confirmed
      // In a real implementation, you'd want to check specific user emails
      const acceptedAttendees = attendees.filter(attendee => attendee.responseStatus === 'accepted');
      const declinedAttendees = attendees.filter(attendee => attendee.responseStatus === 'declined');

      if (acceptedAttendees.length > 0) {
        this.logger.log(`✅ ${acceptedAttendees.length} attendee(s) accepted meeting ${meetingId}`);
        
        // If meeting is still pending and someone accepted, mark as confirmed
        if (meeting.status === 'pending') {
          await this.meetingsService.updateMeetingStatus(
            meetingId,
            'confirmed',
            'Confirmed via Google Calendar'
          );
        }
      }

      if (declinedAttendees.length > 0) {
        this.logger.log(`❌ ${declinedAttendees.length} attendee(s) declined meeting ${meetingId}`);
        
        // If seller declined, cancel the meeting
        // For now, we'll assume any decline means cancellation
        if (meeting.status === 'pending') {
          await this.meetingsService.updateMeetingStatus(
            meetingId,
            'cancelled_by_user',
            'Declined via Google Calendar'
          );
        }
      }

    } catch (error) {
      this.logger.error('❌ Error handling attendee response changes:', error);
    }
  }
}
