import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Meeting } from './entities/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { ListingsService } from '../listings/listings.service';
import { UsersService } from '../accounts/users.service';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    private listingsService: ListingsService,
    private usersService: UsersService,
  ) {}

  async createMeeting(createMeetingDto: CreateMeetingDto, userId: string): Promise<Meeting> {
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

    // Sanitize notes field on backend as well
    let sanitizedNotes = createMeetingDto.notes || '';
    if (sanitizedNotes.includes('import') || sanitizedNotes.includes('export') || sanitizedNotes.includes('./dto')) {
      console.warn('Backend: Notes field contains code-like content, clearing it');
      sanitizedNotes = '';
    }

    // Create meeting
    const meeting = this.meetingRepository.create({
      ...createMeetingDto,
      notes: sanitizedNotes, // Use sanitized notes
      buyerId: userId,
      sellerId: listing.userId,
      status: 'pending',
      googleMeetLink: this.generateGoogleMeetLink(createMeetingDto.listingId, createMeetingDto.date, createMeetingDto.time),
    });

    console.log('Meeting being created:', meeting);
    const savedMeeting = await this.meetingRepository.save(meeting);
    
    // Create calendar event
    try {
      await this.createCalendarEvent(savedMeeting, listing);
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      // Don't fail the meeting creation if calendar creation fails
    }
    
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

    // Filter out occupied slots
    const occupiedSlots = existingMeetings.map(m => m.time);
    return businessHours.filter(slot => !occupiedSlots.includes(slot));
  }

  private generateGoogleMeetLink(listingId: string, date: string, time: string): string {
    const meetingId = `${listingId}-${date}-${time}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    return `https://meet.google.com/${meetingId}`;
  }

  private async createCalendarEvent(meeting: Meeting, listing: any): Promise<void> {
    try {
      // Use Service Account Authentication (easier than OAuth2)
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './src/config/info-matter-5a7b285d5315.json',
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      // Step 2: Initialize Calendar API
      const calendar = google.calendar({ version: 'v3', auth });

      // Step 3: Build start and end times
      const startDateTime = `${meeting.date}T${meeting.time}:00`;
      const start = new Date(startDateTime);
      const end = new Date(start.getTime() + meeting.duration * 60000); // duration in minutes

      // Step 4: Build the event
      const event = {
        summary: `Meeting: ${listing.title}`,
        description: `${meeting.notes || 'Scheduled puppy viewing meeting'}\n\nParticipants:\n- Buyer: ${(await this.usersService.getUserById(meeting.buyerId))?.email || 'Unknown'}\n- Seller: ${listing.user?.email || 'Unknown'}\n\nGoogle Meet Link: ${meeting.googleMeetLink}`,
        start: {
          dateTime: start.toISOString(),
          timeZone: meeting.timezone || 'Asia/Kolkata',
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: meeting.timezone || 'Asia/Kolkata',
        },
        // Note: Service accounts can't invite attendees without domain delegation
        // attendees: [
        //   { email: (listing.user?.email || '') },
        //   { email: (await this.usersService.getUserById(meeting.buyerId))?.email || '' },
        // ],
        // Removed conference data to avoid API errors
        // conferenceData: {
        //   createRequest: {
        //     requestId: meeting.id,
        //     conferenceSolutionKey: { type: 'addOn' },
        //   },
        // },
      };

      // Step 5: Insert into calendar
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        // conferenceDataVersion: 1, // Removed since we're not using conference data
      });

      const createdEvent = response.data;

      // Step 6: Update meeting with generated Google Meet link
      if (createdEvent.conferenceData?.entryPoints?.length) {
        meeting.googleMeetLink = createdEvent.conferenceData.entryPoints[0].uri;
        await this.meetingRepository.save(meeting);
      }

      console.log('Calendar event created successfully:', createdEvent.htmlLink);
    } catch (error) {
      console.error('Error creating calendar event:', error);
    }
  }
}
