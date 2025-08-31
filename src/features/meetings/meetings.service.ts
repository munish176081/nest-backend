import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Meeting } from './entities/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { ListingsService } from '../listings/listings.service';
import { UsersService } from '../accounts/users.service';
import { OAuthCalendarService } from './oauth-calendar.service';
import { UserCalendarTokensService } from './user-calendar-tokens.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    private listingsService: ListingsService,
    private usersService: UsersService,
    private oauthCalendarService: OAuthCalendarService,
    private userCalendarTokensService: UserCalendarTokensService,
    private configService: ConfigService,
  ) {}

  async createMeeting(createMeetingDto: CreateMeetingDto, userId: string, userAccessToken?: string, userRefreshToken?: string): Promise<Meeting> {
    // Debug: Log the received data
    console.log('Backend received meeting data:', createMeetingDto);
    console.log('Notes field received:', createMeetingDto.notes);
    
    // Get listing details
    const listing = await this.listingsService.getListingById(createMeetingDto.listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check if user is not the listing owner
    if (listing.userId === userId) {
      throw new ForbiddenException('Cannot schedule meeting with yourself');
    }

    // 🚫 DUPLICATE MEETING PREVENTION
    await this.checkDuplicateMeeting(createMeetingDto.listingId, userId);

    // 📅 SELLER AVAILABILITY CHECKING
    await this.checkSellerAvailability(
      listing.userId, 
      createMeetingDto.date, 
      createMeetingDto.time, 
      createMeetingDto.duration,
      createMeetingDto.timezone
    );

    // Sanitize notes field on backend as well
    let sanitizedNotes = createMeetingDto.notes || '';
    if (sanitizedNotes.includes('import') || sanitizedNotes.includes('export') || sanitizedNotes.includes('./dto')) {
      console.warn('Backend: Notes field contains code-like content, clearing it');
      sanitizedNotes = '';
    }

    // Get buyer and seller details for calendar event
    const buyer = await this.usersService.getUserById(userId);
    const seller = await this.usersService.getUserById(listing.userId);

         // 🔐 VALIDATE AND CREATE GOOGLE CALENDAR EVENT FIRST
     let calendarEvent = null;
     if (userAccessToken && buyer && seller) {
       try {
         // Validate access token format first
         if (!userAccessToken.startsWith('ya29.') && !userAccessToken.startsWith('1//')) {
           console.warn('Invalid access token format:', userAccessToken.substring(0, 50));
           throw new Error('Invalid access token format');
         }
         
         console.log('Creating OAuth calendar event...');
         console.log('Access token preview:', userAccessToken.substring(0, 20) + '...');
         console.log('Token length:', userAccessToken.length);
         
         // Skip token validation for now - go directly to calendar creation
         console.log('Skipping token validation - proceeding directly to calendar creation');
         
                   // Create calendar event BEFORE saving meeting with automatic token refresh
          calendarEvent = await this.oauthCalendarService.executeWithTokenRefresh(
            userAccessToken,
            userRefreshToken,
            async (validToken) => {
              return await this.oauthCalendarService.createCalendarEventWithOAuth(
                validToken,
                { ...createMeetingDto, id: 'temp-id' }, // Pass meeting data without ID
                listing,
                buyer.email,
                seller.email
              );
            }
          );
         
         console.log('OAuth calendar event created successfully:', calendarEvent);
       } catch (error) {
         console.error('Failed to create OAuth calendar event:', error);
         
         // Log detailed error information
         if (error.response?.data?.error) {
           console.error('Google API Error Details:', {
             message: error.response.data.error.message,
             code: error.response.data.error.code,
             status: error.response.data.error.status
           });
         }
         
         // 🚫 FAIL THE ENTIRE OPERATION if calendar creation fails
         throw new Error(`Failed to create Google Calendar event: ${error.message}`);
       }
     } else {
       console.log('No access token provided or missing user data - meeting created without calendar integration');
     }

     // Create meeting with calendar event ID if available
     const meeting = this.meetingRepository.create({
       ...createMeetingDto,
       notes: sanitizedNotes,
       buyerId: userId,
       sellerId: listing.userId,
       status: 'pending',
       googleMeetLink: calendarEvent?.googleMeetLink || this.generateGoogleMeetLink(createMeetingDto.listingId, createMeetingDto.date, createMeetingDto.time),
       calendarEventId: calendarEvent?.eventId || null, // Store the Google Calendar event ID
     });

     console.log('Meeting being created:', meeting);
     const savedMeeting = await this.meetingRepository.save(meeting);
     
     return savedMeeting;
  }

  async getUserMeetings(userId: string): Promise<MeetingResponseDto[]> {
    const meetings = await this.meetingRepository.find({
      where: [
        { buyerId: userId },
        { sellerId: userId }
      ],
      order: { createdAt: 'DESC' }
    });

    // Populate additional fields by joining with users and listings
    const enrichedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        // Get buyer details
        const buyer = await this.usersService.getUserById(meeting.buyerId);
        
        // Get seller details
        const seller = await this.usersService.getUserById(meeting.sellerId);
        
        // Get listing details
        const listing = await this.listingsService.getListingById(meeting.listingId);

                 // 🔄 SYNC MEETING STATUS WITH GOOGLE CALENDAR (if available)
         let currentStatus = meeting.status;
         
         // Check if calendar sync is enabled in configuration
         const enableCalendarSync = this.configService.get<boolean>('ENABLE_CALENDAR_SYNC', true);
         
         if (meeting.calendarEventId && enableCalendarSync) {
           try {
             const userTokens = await this.getUserCalendarTokens(meeting.sellerId);
             if (userTokens?.access_token) {
               try {
                 // Use token refresh mechanism
                 const calendarEvent = await this.oauthCalendarService.executeWithTokenRefresh(
                   userTokens.access_token,
                   userTokens.refresh_token,
                   async (validToken) => {
                     return await this.oauthCalendarService.getCalendarEvent(
                       validToken,
                       'primary',
                       meeting.calendarEventId
                     );
                   }
                 );

                 console.log('Calendar event:', calendarEvent);
                 
                 if (calendarEvent) {
                   // 🔄 Enhanced status update based on calendar data
                   const newStatus = this.determineMeetingStatusFromCalendar(calendarEvent);
                   
                   if (newStatus !== meeting.status) {
                     console.log(`🔄 Status change detected: ${meeting.status} → ${newStatus}`);
                     currentStatus = newStatus;
                     
                     // Update database with new status
                     const reason = this.getStatusChangeReason(newStatus, calendarEvent);
                     await this.updateMeetingStatus(meeting.id, newStatus, reason);
                   } else {
                     currentStatus = meeting.status; // Keep existing status
                   }
                 }
               } catch (calendarError) {
                 console.log(`Calendar query failed for meeting ${meeting.id}:`, calendarError.message);
                 // Continue with stored status if calendar query fails
                 currentStatus = meeting.status;
               }
             } else {
               console.log(`No calendar tokens found for seller ${meeting.sellerId}`);
               currentStatus = meeting.status;
             }
           } catch (error) {
             console.log(`Calendar sync failed for meeting ${meeting.id}:`, error.message);
             // Continue with stored status if calendar query fails
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
          status: currentStatus, // Use synced status
          googleMeetLink: meeting.googleMeetLink,
          calendarEventId: meeting.calendarEventId,
          notes: meeting.notes,
          createdAt: meeting.createdAt,
          updatedAt: meeting.updatedAt,
        } as MeetingResponseDto;
      })
    );

    return enrichedMeetings;
  }

  async getMeeting(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({ where: { id } });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.buyerId !== userId && meeting.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return meeting;
  }

  async updateMeeting(id: string, updateMeetingDto: UpdateMeetingDto, userId: string): Promise<Meeting> {
    const meeting = await this.getMeeting(id, userId);
    
    // Only allow updates if meeting is pending
    if (meeting.status !== 'pending') {
      throw new BadRequestException('Cannot update meeting that is not pending');
    }

    Object.assign(meeting, updateMeetingDto);
    return this.meetingRepository.save(meeting);
  }

  async confirmMeeting(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.getMeeting(id, userId);
    
    // Only seller can confirm
    if (meeting.sellerId !== userId) {
      throw new ForbiddenException('Only seller can confirm meetings');
    }

    if (meeting.status !== 'pending') {
      throw new BadRequestException('Meeting is not pending');
    }

    meeting.status = 'confirmed';
    return this.meetingRepository.save(meeting);
  }

  async rejectMeeting(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.getMeeting(id, userId);
    
    // Only seller can reject
    if (meeting.sellerId !== userId) {
      throw new ForbiddenException('Only seller can reject meetings');
    }

    if (meeting.status !== 'pending') {
      throw new BadRequestException('Meeting is not pending');
    }

    meeting.status = 'cancelled_by_seller';
    return this.meetingRepository.save(meeting);
  }

  async cancelMeeting(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.getMeeting(id, userId);
    
    if (!['pending', 'confirmed'].includes(meeting.status)) {
      throw new BadRequestException('Cannot cancel this meeting');
    }

    meeting.status = 'cancelled';
    return this.meetingRepository.save(meeting);
  }

  async getListingMeetings(listingId: string, userId: string): Promise<MeetingResponseDto[]> {
    const meetings = await this.meetingRepository.find({
      where: { listingId },
      order: { createdAt: 'DESC' }
    });

    // Populate additional fields by joining with users and listings
    const enrichedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        // Get buyer details
        const buyer = await this.usersService.getUserById(meeting.buyerId);
        
        // Get seller details
        const seller = await this.usersService.getUserById(meeting.sellerId);
        
        // Get listing details
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
        } as MeetingResponseDto;
      })
    );

    return enrichedMeetings;
  }

  async getAvailableSlots(listingId: string, date: string, userId: string): Promise<string[]> {
    // Get existing meetings for this listing on the specified date
    const existingMeetings = await this.meetingRepository.find({
      where: { 
        listingId,
        date,
        status: In(['pending', 'confirmed'])
      }
    });

    // Business hours with 30-minute intervals
    const businessHours = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    // Filter out occupied slots considering meeting duration
    const occupiedSlots = new Set<string>();
    
    existingMeetings.forEach(meeting => {
      const startTime = meeting.time;
      const duration = meeting.duration; // in minutes
      
      // Add the start time slot
      occupiedSlots.add(startTime);
      
      // Add additional slots based on duration
      // For 30-minute meetings, only the start time is blocked
      // For 1-hour meetings, both start time and next 30-minute slot are blocked
      // For 1.5-hour meetings, start time and next 2 slots are blocked
      // For 2-hour meetings, start time and next 3 slots are blocked
      
      if (duration > 30) {
        // Calculate how many additional 30-minute slots are needed
        const additionalSlots = Math.ceil((duration - 30) / 30);
        
        for (let i = 1; i <= additionalSlots; i++) {
          const currentTime = new Date(`2000-01-01T${startTime}:00`);
          const nextSlot = new Date(currentTime.getTime() + (i * 30 * 60000));
          const nextSlotTime = nextSlot.toTimeString().slice(0, 5);
          
          // Only add if it's within business hours
          if (businessHours.includes(nextSlotTime)) {
            occupiedSlots.add(nextSlotTime);
          }
        }
      }
    });

    return businessHours.filter(slot => !occupiedSlots.has(slot));
  }

  /**
   * 🚫 Check for duplicate meetings (one active meeting per buyer-listing pair)
   */
  private async checkDuplicateMeeting(listingId: string, buyerId: string): Promise<void> {
    const existingMeeting = await this.meetingRepository.findOne({
      where: {
        listingId,
        buyerId,
        status: In(['pending', 'confirmed', 'rescheduled'])
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

      throw new ConflictException(errorDetails);
    }
  }

  /**
   * 📅 Check seller's Google Calendar availability for the requested time slot
   */
  private async checkSellerAvailability(
    sellerId: string, 
    date: string, 
    time: string, 
    duration: number,
    timezone: string
  ): Promise<void> {
    try {
      // Get seller's details to check if they have calendar integration
      const seller = await this.usersService.getUserById(sellerId);
      if (!seller) {
        throw new NotFoundException('Seller not found');
      }

      console.log(`📅 Checking availability for seller ${sellerId} on ${date} at ${time}`);
      
      // If seller has calendar integration, check their availability
      const sellerTokens = await this.getSellerCalendarTokens(sellerId);
      if (sellerTokens) {
        const isAvailable = await this.checkCalendarAvailability(
          sellerTokens.access_token,
          date,
          time,
          duration,
          timezone
        );

        if (!isAvailable) {
          throw new ConflictException({
            message: 'The seller is not available at the requested time',
            suggestion: 'Please choose a different time slot',
            availableSlots: await this.getAvailableSlots(sellerId, date, sellerId)
          });
        }
      } else {
        console.log(`⚠️ Seller ${sellerId} doesn't have calendar integration - skipping availability check`);
      }

    } catch (error) {
      if (error instanceof ConflictException) {
        throw error; // Re-throw availability conflicts
      }
      
      // Log other errors but don't block meeting creation
      console.error('Error checking seller availability:', error);
      console.log('⚠️ Proceeding with meeting creation despite availability check failure');
    }
  }

  /**
   * 🔍 Get seller's calendar tokens from database
   */
  private async getSellerCalendarTokens(sellerId: string): Promise<{ access_token: string; refresh_token?: string } | null> {
    try {
      const tokens = await this.userCalendarTokensService.getTokens(sellerId);
      if (tokens) {
        return {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken
        };
      }
      return null;
    } catch (error) {
      console.error(`Error getting calendar tokens for seller ${sellerId}:`, error);
      return null;
    }
  }

  // Public method to get user calendar tokens for webhook processing
  async getUserCalendarTokens(userId: string): Promise<{ access_token: string; refresh_token?: string } | null> {
    console.log('Getting user calendar tokens for:', userId);
    return this.getSellerCalendarTokens(userId);
  }

  /**
   * 📅 Check if seller is available in their Google Calendar
   */
  private async checkCalendarAvailability(
    accessToken: string,
    date: string,
    time: string,
    duration: number,
    timezone: string
  ): Promise<boolean> {
    try {
      // Use OAuth calendar service to check availability with token refresh
      return await this.oauthCalendarService.executeWithTokenRefresh(
        accessToken,
        undefined, // No refresh token available in this context
        async (validToken) => {
          return await this.oauthCalendarService.checkAvailability(
            validToken,
            date,
            time,
            duration,
            timezone
          );
        }
      );
    } catch (error) {
      console.error('Calendar availability check failed:', error);
      return true; // Assume available if check fails
    }
  }

  /**
   * 🔍 Find meeting by calendar event ID (for webhook processing)
   */
  async findByCalendarEventId(calendarEventId: string): Promise<Meeting | null> {
    return await this.meetingRepository.findOne({
      where: { calendarEventId }
    });
  }

  /**
   * 🔍 Find meeting by ID (for webhook processing)
   */
  async findById(id: string): Promise<Meeting | null> {
    return await this.meetingRepository.findOne({
      where: { id }
    });
  }

  /**
   * 🔄 Update meeting status (for webhook processing)
   */
  async updateMeetingStatus(
    meetingId: string, 
    newStatus: string, 
    reason?: string
  ): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId }
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Validate status transition
    await this.validateStatusTransition(meeting.status, newStatus);

    // Update meeting
    meeting.status = newStatus;
    meeting.updatedAt = new Date();

    // Store cancellation/update reason if provided
    if (reason && (newStatus.includes('cancelled') || newStatus === 'rescheduled')) {
      const reasonData = {
        reason,
        updatedBy: 'system',
        updatedAt: new Date(),
        originalStatus: meeting.status
      };
      
      // Store in notes for now (could be separate field)
      meeting.notes = meeting.notes ? 
        `${meeting.notes}\n\n[System Update]: ${reason}` : 
        `[System Update]: ${reason}`;
    }

    return await this.meetingRepository.save(meeting);
  }

  /**
   * 📅 Update meeting date and time (for reschedule via calendar)
   */
  async updateMeetingDateTime(
    meetingId: string, 
    newDate: string, 
    newTime: string
  ): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId }
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Update meeting time
    meeting.date = newDate;
    meeting.time = newTime;
    meeting.status = 'rescheduled';
    meeting.updatedAt = new Date();

    return await this.meetingRepository.save(meeting);
  }

  /**
   * ✅ Validate status transitions
   */
  private async validateStatusTransition(currentStatus: string, newStatus: string): Promise<void> {
    const validTransitions: Record<string, string[]> = {
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
      throw new BadRequestException(
        `Invalid status transition: ${currentStatus} -> ${newStatus}. ` +
        `Allowed transitions: ${allowedTransitions.join(', ')}`
      );
    }
  }

  private generateGoogleMeetLink(listingId: string, date: string, time: string): string {
    const meetingId = `${listingId}-${date}-${time}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    return `https://meet.google.com/${meetingId}`;
  }

  /**
   * 🔄 Determine meeting status based on Google Calendar event data
   */
  private determineMeetingStatusFromCalendar(calendarEvent: any): string {
    // Handle event-level status changes
    if (calendarEvent.status === 'cancelled') {
      return 'cancelled_by_user';
    }

    if (!calendarEvent.attendees || calendarEvent.attendees.length === 0) {
      return 'pending'; // No attendees, assume pending
    }

    // Find buyer (organizer) and seller attendees
    const buyerAttendee = calendarEvent.attendees.find((att: any) => att.organizer);
    const sellerAttendee = calendarEvent.attendees.find((att: any) => !att.organizer);

    if (!buyerAttendee || !sellerAttendee) {
      return 'pending'; // Missing attendee info
    }

    // Handle individual response statuses
    if (buyerAttendee.responseStatus === 'declined') {
      return 'cancelled_by_buyer';
    }

    if (sellerAttendee.responseStatus === 'declined') {
      return 'cancelled_by_seller';
    }

    // Handle tentative responses
    if (buyerAttendee.responseStatus === 'tentative' || sellerAttendee.responseStatus === 'tentative') {
      return 'tentative';
    }

    // Check if both parties accepted
    if (buyerAttendee.responseStatus === 'accepted' && sellerAttendee.responseStatus === 'accepted') {
      return 'confirmed';
    }

    // Default: still waiting for responses
    return 'pending';
  }

  /**
   * 📝 Generate human-readable reason for status change
   */
  private getStatusChangeReason(newStatus: string, calendarEvent: any): string {
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
}
