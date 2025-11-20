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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const meeting_entity_1 = require("./entities/meeting.entity");
const listings_service_1 = require("../listings/listings.service");
const users_service_1 = require("../accounts/users.service");
const oauth_calendar_service_1 = require("./oauth-calendar.service");
const user_calendar_tokens_service_1 = require("./user-calendar-tokens.service");
const config_1 = require("@nestjs/config");
let MeetingsService = class MeetingsService {
    constructor(meetingRepository, listingsService, usersService, oauthCalendarService, userCalendarTokensService, configService) {
        this.meetingRepository = meetingRepository;
        this.listingsService = listingsService;
        this.usersService = usersService;
        this.oauthCalendarService = oauthCalendarService;
        this.userCalendarTokensService = userCalendarTokensService;
        this.configService = configService;
    }
    async createMeeting(createMeetingDto, userId, userAccessToken, userRefreshToken) {
        console.log('Backend received meeting data:', createMeetingDto);
        console.log('Notes field received:', createMeetingDto.notes);
        const listing = await this.listingsService.getListingById(createMeetingDto.listingId);
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.userId === userId) {
            throw new common_1.ForbiddenException('Cannot schedule meeting with yourself');
        }
        await this.checkDuplicateMeeting(createMeetingDto.listingId, userId);
        await this.checkSellerAvailability(listing.userId, createMeetingDto.date, createMeetingDto.time, createMeetingDto.duration, createMeetingDto.timezone);
        let sanitizedNotes = createMeetingDto.notes || '';
        if (sanitizedNotes.includes('import') || sanitizedNotes.includes('export') || sanitizedNotes.includes('./dto')) {
            console.warn('Backend: Notes field contains code-like content, clearing it');
            sanitizedNotes = '';
        }
        const buyer = await this.usersService.getUserById(userId);
        const seller = await this.usersService.getUserById(listing.userId);
        let calendarEvent = null;
        if (userAccessToken && buyer && seller) {
            try {
                if (!userAccessToken.startsWith('ya29.') && !userAccessToken.startsWith('1//')) {
                    console.warn('Invalid access token format:', userAccessToken.substring(0, 50));
                    throw new Error('Invalid access token format');
                }
                console.log('Creating OAuth calendar event...');
                console.log('Access token preview:', userAccessToken.substring(0, 20) + '...');
                console.log('Token length:', userAccessToken.length);
                console.log('Skipping token validation - proceeding directly to calendar creation');
                calendarEvent = await this.oauthCalendarService.executeWithTokenRefresh(userAccessToken, userRefreshToken, async (validToken) => {
                    return await this.oauthCalendarService.createCalendarEventWithOAuth(validToken, { ...createMeetingDto, id: 'temp-id' }, listing, buyer.email, seller.email);
                });
                console.log('OAuth calendar event created successfully:', calendarEvent);
            }
            catch (error) {
                console.error('Failed to create OAuth calendar event:', error);
                if (error.response?.data?.error) {
                    console.error('Google API Error Details:', {
                        message: error.response.data.error.message,
                        code: error.response.data.error.code,
                        status: error.response.data.error.status
                    });
                }
                throw new Error(`Failed to create Google Calendar event: ${error.message}`);
            }
        }
        else {
            console.log('No access token provided or missing user data - meeting created without calendar integration');
        }
        const meeting = this.meetingRepository.create({
            ...createMeetingDto,
            notes: sanitizedNotes,
            buyerId: userId,
            sellerId: listing.userId,
            status: 'pending',
            googleMeetLink: calendarEvent?.googleMeetLink || this.generateGoogleMeetLink(createMeetingDto.listingId, createMeetingDto.date, createMeetingDto.time),
            calendarEventId: calendarEvent?.eventId || null,
        });
        console.log('Meeting being created:', meeting);
        const savedMeeting = await this.meetingRepository.save(meeting);
        return savedMeeting;
    }
    async getUserMeetings(userId) {
        const meetings = await this.meetingRepository.find({
            where: [
                { buyerId: userId },
                { sellerId: userId }
            ],
            order: { createdAt: 'DESC' }
        });
        const enrichedMeetings = await Promise.all(meetings.map(async (meeting) => {
            const buyer = await this.usersService.getUserById(meeting.buyerId);
            const seller = await this.usersService.getUserById(meeting.sellerId);
            const listing = await this.listingsService.getListingById(meeting.listingId);
            let currentStatus = meeting.status;
            const enableCalendarSync = this.configService.get('ENABLE_CALENDAR_SYNC', true);
            if (meeting.calendarEventId && enableCalendarSync) {
                try {
                    const userTokens = await this.getUserCalendarTokens(meeting.sellerId);
                    if (userTokens?.access_token) {
                        try {
                            const calendarEvent = await this.oauthCalendarService.executeWithTokenRefresh(userTokens.access_token, userTokens.refresh_token, async (validToken) => {
                                return await this.oauthCalendarService.getCalendarEvent(validToken, 'primary', meeting.calendarEventId);
                            });
                            console.log('Calendar event:', calendarEvent);
                            if (calendarEvent) {
                                const newStatus = this.determineMeetingStatusFromCalendar(calendarEvent);
                                if (newStatus !== meeting.status) {
                                    console.log(`🔄 Status change detected: ${meeting.status} → ${newStatus}`);
                                    currentStatus = newStatus;
                                    const reason = this.getStatusChangeReason(newStatus, calendarEvent);
                                    await this.updateMeetingStatus(meeting.id, newStatus, reason);
                                }
                                else {
                                    currentStatus = meeting.status;
                                }
                            }
                        }
                        catch (calendarError) {
                            console.log(`Calendar query failed for meeting ${meeting.id}:`, calendarError.message);
                            currentStatus = meeting.status;
                        }
                    }
                    else {
                        console.log(`No calendar tokens found for seller ${meeting.sellerId}`);
                        currentStatus = meeting.status;
                    }
                }
                catch (error) {
                    console.log(`Calendar sync failed for meeting ${meeting.id}:`, error.message);
                    currentStatus = meeting.status;
                }
            }
            return {
                id: meeting.id,
                listingId: meeting.listingId,
                listingTitle: listing?.title || 'Unknown Listing',
                listingType: listing?.type || '',
                buyerId: meeting.buyerId,
                buyerName: buyer?.name || 'Unknown',
                buyerEmail: buyer?.email || '',
                sellerId: meeting.sellerId,
                sellerName: seller?.name || 'Unknown',
                sellerEmail: seller?.email || '',
                date: meeting.date,
                time: meeting.time,
                duration: meeting.duration,
                timezone: meeting.timezone,
                status: currentStatus,
                googleMeetLink: meeting.googleMeetLink,
                calendarEventId: meeting.calendarEventId,
                notes: meeting.notes,
                createdAt: meeting.createdAt,
                updatedAt: meeting.updatedAt,
            };
        }));
        return enrichedMeetings;
    }
    async getMeeting(id, userId) {
        const meeting = await this.meetingRepository.findOne({ where: { id } });
        if (!meeting) {
            throw new common_1.NotFoundException('Meeting not found');
        }
        if (meeting.buyerId !== userId && meeting.sellerId !== userId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return meeting;
    }
    async updateMeeting(id, updateMeetingDto, userId) {
        const meeting = await this.getMeeting(id, userId);
        if (meeting.status !== 'pending') {
            throw new common_1.BadRequestException('Cannot update meeting that is not pending');
        }
        Object.assign(meeting, updateMeetingDto);
        return this.meetingRepository.save(meeting);
    }
    async confirmMeeting(id, userId) {
        const meeting = await this.getMeeting(id, userId);
        if (meeting.sellerId !== userId) {
            throw new common_1.ForbiddenException('Only seller can confirm meetings');
        }
        if (meeting.status !== 'pending') {
            throw new common_1.BadRequestException('Meeting is not pending');
        }
        meeting.status = 'confirmed';
        return this.meetingRepository.save(meeting);
    }
    async rejectMeeting(id, userId) {
        const meeting = await this.getMeeting(id, userId);
        if (meeting.sellerId !== userId) {
            throw new common_1.ForbiddenException('Only seller can reject meetings');
        }
        if (meeting.status !== 'pending') {
            throw new common_1.BadRequestException('Meeting is not pending');
        }
        meeting.status = 'cancelled_by_seller';
        return this.meetingRepository.save(meeting);
    }
    async cancelMeeting(id, userId) {
        const meeting = await this.getMeeting(id, userId);
        if (!['pending', 'confirmed'].includes(meeting.status)) {
            throw new common_1.BadRequestException('Cannot cancel this meeting');
        }
        meeting.status = 'cancelled';
        return this.meetingRepository.save(meeting);
    }
    async getListingMeetings(listingId, userId) {
        const meetings = await this.meetingRepository.find({
            where: { listingId },
            order: { createdAt: 'DESC' }
        });
        const enrichedMeetings = await Promise.all(meetings.map(async (meeting) => {
            const buyer = await this.usersService.getUserById(meeting.buyerId);
            const seller = await this.usersService.getUserById(meeting.sellerId);
            const listing = await this.listingsService.getListingById(meeting.listingId);
            return {
                id: meeting.id,
                listingId: meeting.listingId,
                listingTitle: listing?.title || 'Unknown Listing',
                listingType: listing?.type || '',
                buyerId: meeting.buyerId,
                buyerName: buyer?.name || 'Unknown',
                buyerEmail: buyer?.email || '',
                sellerId: meeting.sellerId,
                sellerName: seller?.name || 'Unknown',
                sellerEmail: seller?.email || '',
                date: meeting.date,
                time: meeting.time,
                duration: meeting.duration,
                timezone: meeting.timezone,
                status: meeting.status,
                googleMeetLink: meeting.googleMeetLink,
                calendarEventId: meeting.calendarEventId,
                notes: meeting.notes,
                createdAt: meeting.createdAt,
                updatedAt: meeting.updatedAt,
            };
        }));
        return enrichedMeetings;
    }
    async getAvailableSlots(listingId, date, userId) {
        const existingMeetings = await this.meetingRepository.find({
            where: {
                listingId,
                date,
                status: (0, typeorm_2.In)(['pending', 'confirmed'])
            }
        });
        const businessHours = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ];
        const occupiedSlots = new Set();
        existingMeetings.forEach(meeting => {
            const startTime = meeting.time;
            const duration = meeting.duration;
            occupiedSlots.add(startTime);
            if (duration > 30) {
                const additionalSlots = Math.ceil((duration - 30) / 30);
                for (let i = 1; i <= additionalSlots; i++) {
                    const currentTime = new Date(`2000-01-01T${startTime}:00`);
                    const nextSlot = new Date(currentTime.getTime() + (i * 30 * 60000));
                    const nextSlotTime = nextSlot.toTimeString().slice(0, 5);
                    if (businessHours.includes(nextSlotTime)) {
                        occupiedSlots.add(nextSlotTime);
                    }
                }
            }
        });
        return businessHours.filter(slot => !occupiedSlots.has(slot));
    }
    async checkDuplicateMeeting(listingId, buyerId) {
        const existingMeeting = await this.meetingRepository.findOne({
            where: {
                listingId,
                buyerId,
                status: (0, typeorm_2.In)(['pending', 'confirmed', 'rescheduled'])
            }
        });
        if (existingMeeting) {
            const errorDetails = {
                message: 'You already have an active meeting for this listing',
                existingMeeting: {
                    id: existingMeeting.id,
                    status: existingMeeting.status,
                    date: existingMeeting.date,
                    time: existingMeeting.time,
                    createdAt: existingMeeting.createdAt
                },
                suggestions: [
                    'Cancel the existing meeting first',
                    'Update the existing meeting time',
                    'Wait for the seller to respond to your current request'
                ]
            };
            throw new common_1.ConflictException(errorDetails);
        }
    }
    async checkSellerAvailability(sellerId, date, time, duration, timezone) {
        try {
            const seller = await this.usersService.getUserById(sellerId);
            if (!seller) {
                throw new common_1.NotFoundException('Seller not found');
            }
            console.log(`📅 Checking availability for seller ${sellerId} on ${date} at ${time}`);
            const sellerTokens = await this.getSellerCalendarTokens(sellerId);
            if (sellerTokens) {
                const isAvailable = await this.checkCalendarAvailability(sellerTokens.access_token, date, time, duration, timezone);
                if (!isAvailable) {
                    throw new common_1.ConflictException({
                        message: 'The seller is not available at the requested time',
                        suggestion: 'Please choose a different time slot',
                        availableSlots: await this.getAvailableSlots(sellerId, date, sellerId)
                    });
                }
            }
            else {
                console.log(`⚠️ Seller ${sellerId} doesn't have calendar integration - skipping availability check`);
            }
        }
        catch (error) {
            if (error instanceof common_1.ConflictException) {
                throw error;
            }
            console.error('Error checking seller availability:', error);
            console.log('⚠️ Proceeding with meeting creation despite availability check failure');
        }
    }
    async getSellerCalendarTokens(sellerId) {
        try {
            const tokens = await this.userCalendarTokensService.getTokens(sellerId);
            if (tokens) {
                return {
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken
                };
            }
            return null;
        }
        catch (error) {
            console.error(`Error getting calendar tokens for seller ${sellerId}:`, error);
            return null;
        }
    }
    async getUserCalendarTokens(userId) {
        console.log('Getting user calendar tokens for:', userId);
        return this.getSellerCalendarTokens(userId);
    }
    async checkCalendarAvailability(accessToken, date, time, duration, timezone) {
        try {
            return await this.oauthCalendarService.executeWithTokenRefresh(accessToken, undefined, async (validToken) => {
                return await this.oauthCalendarService.checkAvailability(validToken, date, time, duration, timezone);
            });
        }
        catch (error) {
            console.error('Calendar availability check failed:', error);
            return true;
        }
    }
    async findByCalendarEventId(calendarEventId) {
        return await this.meetingRepository.findOne({
            where: { calendarEventId }
        });
    }
    async findById(id) {
        return await this.meetingRepository.findOne({
            where: { id }
        });
    }
    async updateMeetingStatus(meetingId, newStatus, reason) {
        const meeting = await this.meetingRepository.findOne({
            where: { id: meetingId }
        });
        if (!meeting) {
            throw new common_1.NotFoundException('Meeting not found');
        }
        await this.validateStatusTransition(meeting.status, newStatus);
        meeting.status = newStatus;
        meeting.updatedAt = new Date();
        if (reason && (newStatus.includes('cancelled') || newStatus === 'rescheduled')) {
            const reasonData = {
                reason,
                updatedBy: 'system',
                updatedAt: new Date(),
                originalStatus: meeting.status
            };
            meeting.notes = meeting.notes ?
                `${meeting.notes}\n\n[System Update]: ${reason}` :
                `[System Update]: ${reason}`;
        }
        return await this.meetingRepository.save(meeting);
    }
    async updateMeetingDateTime(meetingId, newDate, newTime) {
        const meeting = await this.meetingRepository.findOne({
            where: { id: meetingId }
        });
        if (!meeting) {
            throw new common_1.NotFoundException('Meeting not found');
        }
        meeting.date = newDate;
        meeting.time = newTime;
        meeting.status = 'rescheduled';
        meeting.updatedAt = new Date();
        return await this.meetingRepository.save(meeting);
    }
    async validateStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            pending: ['confirmed', 'cancelled_by_buyer', 'cancelled_by_seller', 'cancelled_by_user', 'tentative', 'expired'],
            confirmed: ['completed', 'cancelled_by_buyer', 'cancelled_by_seller', 'cancelled_by_user', 'no_show', 'rescheduled', 'tentative'],
            rescheduled: ['confirmed', 'cancelled_by_buyer', 'cancelled_by_seller', 'cancelled_by_user', 'tentative'],
            tentative: ['confirmed', 'cancelled_by_buyer', 'cancelled_by_seller', 'cancelled_by_user', 'expired'],
            cancelled_by_buyer: [],
            cancelled_by_seller: [],
            cancelled_by_user: [],
            deleted: [],
            completed: [],
            expired: [],
            no_show: []
        };
        const allowedTransitions = validTransitions[currentStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
            throw new common_1.BadRequestException(`Invalid status transition: ${currentStatus} -> ${newStatus}. ` +
                `Allowed transitions: ${allowedTransitions.join(', ')}`);
        }
    }
    generateGoogleMeetLink(listingId, date, time) {
        const meetingId = `${listingId}-${date}-${time}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        return `https://meet.google.com/${meetingId}`;
    }
    determineMeetingStatusFromCalendar(calendarEvent) {
        if (calendarEvent.status === 'cancelled') {
            return 'cancelled_by_user';
        }
        if (!calendarEvent.attendees || calendarEvent.attendees.length === 0) {
            return 'pending';
        }
        const buyerAttendee = calendarEvent.attendees.find((att) => att.organizer);
        const sellerAttendee = calendarEvent.attendees.find((att) => !att.organizer);
        if (!buyerAttendee || !sellerAttendee) {
            return 'pending';
        }
        if (buyerAttendee.responseStatus === 'declined') {
            return 'cancelled_by_buyer';
        }
        if (sellerAttendee.responseStatus === 'declined') {
            return 'cancelled_by_seller';
        }
        if (buyerAttendee.responseStatus === 'tentative' || sellerAttendee.responseStatus === 'tentative') {
            return 'tentative';
        }
        if (buyerAttendee.responseStatus === 'accepted' && sellerAttendee.responseStatus === 'accepted') {
            return 'confirmed';
        }
        return 'pending';
    }
    getStatusChangeReason(newStatus, calendarEvent) {
        const baseReason = 'Updated via Google Calendar sync';
        switch (newStatus) {
            case 'confirmed':
                return 'Both parties accepted the meeting invitation';
            case 'cancelled_by_buyer':
                return 'Buyer declined the meeting invitation';
            case 'cancelled_by_seller':
                return 'Seller declined the meeting invitation';
            case 'cancelled_by_user':
                return 'Meeting was cancelled in Google Calendar';
            case 'tentative':
                return 'One or both parties marked the meeting as tentative';
            case 'pending':
                return 'Waiting for both parties to respond to invitation';
            default:
                return baseReason;
        }
    }
};
exports.MeetingsService = MeetingsService;
exports.MeetingsService = MeetingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(meeting_entity_1.Meeting)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        listings_service_1.ListingsService,
        users_service_1.UsersService,
        oauth_calendar_service_1.OAuthCalendarService,
        user_calendar_tokens_service_1.UserCalendarTokensService,
        config_1.ConfigService])
], MeetingsService);
//# sourceMappingURL=meetings.service.js.map