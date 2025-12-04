"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CalendarWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarWebhookController = void 0;
const common_1 = require("@nestjs/common");
const meetings_service_1 = require("./meetings.service");
const oauth_calendar_service_1 = require("./oauth-calendar.service");
let CalendarWebhookController = CalendarWebhookController_1 = class CalendarWebhookController {
    constructor(meetingsService, oauthCalendarService) {
        this.meetingsService = meetingsService;
        this.oauthCalendarService = oauthCalendarService;
        this.logger = new common_1.Logger(CalendarWebhookController_1.name);
    }
    async handleGoogleCalendarWebhook(headers, payload) {
        this.logger.log('📨 Received Google Calendar webhook', {
            resourceId: payload.resourceId,
            kind: payload.kind,
        });
        try {
            this.verifyWebhookSignature(headers, payload);
            await this.processCalendarNotification(payload);
            return {
                success: true,
                message: 'Webhook processed successfully'
            };
        }
        catch (error) {
            this.logger.error('❌ Error processing calendar webhook:', error);
            if (error instanceof common_1.BadRequestException) {
                return {
                    success: false,
                    message: error.message
                };
            }
            throw error;
        }
    }
    async testEventUpdate(eventUpdate) {
        this.logger.log('🧪 Processing test calendar event update', eventUpdate);
        try {
            await this.handleCalendarEventUpdate(eventUpdate);
            return { success: true, message: 'Test event update processed' };
        }
        catch (error) {
            this.logger.error('❌ Error processing test event update:', error);
            throw error;
        }
    }
    async testConfirmMeeting(body) {
        this.logger.log('🧪 Testing meeting confirmation for meeting:', body);
        if (!body || !body.meetingId) {
            throw new common_1.BadRequestException('Request body must contain meetingId');
        }
        try {
            const meeting = await this.meetingsService.findById(body.meetingId);
            if (!meeting) {
                throw new common_1.BadRequestException(`Meeting not found with ID: ${body.meetingId}`);
            }
            if (meeting.status !== 'pending') {
                throw new common_1.BadRequestException(`Meeting is not pending (current status: ${meeting.status})`);
            }
            this.logger.log(`📝 Found meeting: ${meeting.id} with status: ${meeting.status}`);
            const mockAttendees = [
                { email: 'seller@example.com', responseStatus: 'accepted' },
                { email: 'buyer@example.com', responseStatus: 'accepted' }
            ];
            await this.handleAttendeeResponseChanges(meeting.id, mockAttendees);
            const updatedMeeting = await this.meetingsService.findById(body.meetingId);
            return {
                success: true,
                message: 'Meeting confirmed via test webhook',
                meetingId: body.meetingId,
                oldStatus: meeting.status,
                newStatus: updatedMeeting?.status || 'unknown',
                meeting: updatedMeeting
            };
        }
        catch (error) {
            this.logger.error('❌ Error in test confirm meeting:', error);
            throw error;
        }
    }
    verifyWebhookSignature(headers, payload) {
        const channelId = headers['x-goog-channel-id'];
        const channelToken = headers['x-goog-channel-token'];
        if (!channelId || !channelToken) {
            throw new common_1.BadRequestException('Missing required webhook headers');
        }
        this.logger.debug('🔐 Webhook verification passed', {
            channelId: channelId.substring(0, 8) + '...',
            hasToken: !!channelToken
        });
    }
    async processCalendarNotification(payload) {
        this.logger.log('📬 Processing calendar notification', {
            resourceId: payload.resourceId,
            resourceUri: payload.resourceUri
        });
        const { calendarId, eventId } = this.parseResourceUri(payload.resourceUri);
        if (eventId) {
            const eventUpdate = await this.fetchEventDetails(calendarId, eventId);
            if (eventUpdate) {
                await this.handleCalendarEventUpdate(eventUpdate);
            }
        }
    }
    parseResourceUri(resourceUri) {
        const match = resourceUri.match(/calendars\/([^\/]+)\/events(?:\/([^?]+))?/);
        return {
            calendarId: match?.[1] || 'primary',
            eventId: match?.[2] || undefined
        };
    }
    async fetchEventDetails(calendarId, eventId) {
        try {
            this.logger.log(`📅 Fetching event ${eventId} from calendar ${calendarId}`);
            const meeting = await this.meetingsService.findByCalendarEventId(eventId);
            if (!meeting) {
                this.logger.log('📝 No meeting found for calendar event ID:', eventId);
                return null;
            }
            const userTokens = await this.meetingsService.getUserCalendarTokens(meeting.sellerId);
            if (!userTokens?.access_token) {
                this.logger.log('🔑 No access token found for user:', meeting.sellerId);
                return null;
            }
            const calendarEvent = await this.oauthCalendarService.getCalendarEvent(userTokens.access_token, calendarId, eventId);
            if (!calendarEvent) {
                this.logger.log('📅 No calendar event found');
                return null;
            }
            const eventUpdate = {
                eventId: eventId,
                calendarId: calendarId,
                eventType: 'updated',
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
        }
        catch (error) {
            this.logger.error('❌ Error fetching event details:', error);
            return null;
        }
    }
    async handleCalendarEventUpdate(eventUpdate) {
        this.logger.log('🔄 Handling calendar event update', {
            eventId: eventUpdate.eventId,
            eventType: eventUpdate.eventType,
            status: eventUpdate.status
        });
        try {
            const meeting = await this.meetingsService.findByCalendarEventId(eventUpdate.eventId);
            if (!meeting) {
                this.logger.log('📝 No meeting found for calendar event ID:', eventUpdate.eventId);
                return;
            }
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
            if (eventUpdate.attendees) {
                await this.handleAttendeeResponseChanges(meeting.id, eventUpdate.attendees);
            }
        }
        catch (error) {
            this.logger.error('❌ Error handling calendar event update:', error);
            throw error;
        }
    }
    async handleMeetingCancellation(meetingId, eventUpdate) {
        this.logger.log(`❌ Processing meeting cancellation for meeting ${meetingId}`);
        await this.meetingsService.updateMeetingStatus(meetingId, 'cancelled_by_user', 'Cancelled via Google Calendar');
        this.logger.log('📧 Would send cancellation notifications to participants');
    }
    async handleMeetingReschedule(meetingId, eventUpdate) {
        this.logger.log(`📅 Processing meeting reschedule for meeting ${meetingId}`);
        if (eventUpdate.start?.dateTime && eventUpdate.end?.dateTime) {
            const startDate = new Date(eventUpdate.start.dateTime);
            const newDate = startDate.toISOString().split('T')[0];
            const newTime = startDate.toTimeString().split(' ')[0].substring(0, 5);
            await this.meetingsService.updateMeetingDateTime(meetingId, newDate, newTime);
            this.logger.log('📧 Would send reschedule notifications to participants');
        }
    }
    async handleAttendeeResponseChanges(meetingId, attendees) {
        this.logger.log(`👥 Processing attendee response changes for meeting ${meetingId}`);
        try {
            const meeting = await this.meetingsService.findById(meetingId);
            if (!meeting) {
                this.logger.log('📝 Meeting not found for attendee response processing');
                return;
            }
            const acceptedAttendees = attendees.filter(attendee => attendee.responseStatus === 'accepted');
            const declinedAttendees = attendees.filter(attendee => attendee.responseStatus === 'declined');
            if (acceptedAttendees.length > 0) {
                this.logger.log(`✅ ${acceptedAttendees.length} attendee(s) accepted meeting ${meetingId}`);
                if (meeting.status === 'pending') {
                    await this.meetingsService.updateMeetingStatus(meetingId, 'confirmed', 'Confirmed via Google Calendar');
                }
            }
            if (declinedAttendees.length > 0) {
                this.logger.log(`❌ ${declinedAttendees.length} attendee(s) declined meeting ${meetingId}`);
                if (meeting.status === 'pending') {
                    await this.meetingsService.updateMeetingStatus(meetingId, 'cancelled_by_user', 'Declined via Google Calendar');
                }
            }
        }
        catch (error) {
            this.logger.error('❌ Error handling attendee response changes:', error);
        }
    }
};
exports.CalendarWebhookController = CalendarWebhookController;
__decorate([
    (0, common_1.Post)('google'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CalendarWebhookController.prototype, "handleGoogleCalendarWebhook", null);
__decorate([
    (0, common_1.Post)('test-event-update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarWebhookController.prototype, "testEventUpdate", null);
__decorate([
    (0, common_1.Post)('test-confirm-meeting'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarWebhookController.prototype, "testConfirmMeeting", null);
exports.CalendarWebhookController = CalendarWebhookController = CalendarWebhookController_1 = __decorate([
    (0, common_1.Controller)('calendar/webhook'),
    __metadata("design:paramtypes", [meetings_service_1.MeetingsService,
        oauth_calendar_service_1.OAuthCalendarService])
], CalendarWebhookController);
//# sourceMappingURL=calendar-webhook.controller.js.map