import { Injectable, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { UserCalendarTokensService } from './user-calendar-tokens.service';

@Injectable()
export class OAuthCalendarService {
  private oauth2Client: OAuth2Client;

  constructor(
    private configService: ConfigService,
    private userCalendarTokensService: UserCalendarTokensService
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID, // Your client ID
      process.env.GOOGLE_CLIENT_SECRET, // Your client secret
      process.env.GOOGLE_REDIRECT_URI // Redirect URI
    );
  }

  /**
   * Generate OAuth URL for user to authorize calendar access
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
    });
  }

  /**
   * Exchange authorization code for access tokens
   */
  async getAccessToken(code: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  /**
   * Create calendar event with full functionality (attendees + Google Meet)
   */
  async createCalendarEventWithOAuth(
    accessToken: string,
    meeting: any,
    listing: any,
    buyerEmail: string,
    sellerEmail: string
  ): Promise<any> {
    try {
      console.log('🔧 Creating fresh OAuth2Client for calendar event creation');
      
      // Create a fresh OAuth2Client instance for this operation
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      console.log('🔧 Setting credentials with access token');
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      console.log('🔧 Creating calendar API client');
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Get user profile for proper organizer information (temporarily disabled for debugging)
      // const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      let userProfile = null;
      console.log('Skipping user profile fetch for debugging');

      // Build start and end times
      const startDateTime = `${meeting.date}T${meeting.time}:00`;
      const start = new Date(startDateTime);
      const end = new Date(start.getTime() + meeting.duration * 60000);

      // Create event with full functionality
      const event = {
        summary: `Puppy Viewing: ${listing.title}`,
        description: `
        Puppy Viewing Appointment
        
        Listing: ${listing.title}
        Duration: ${meeting.duration} minutes
        Meeting ID: ${meeting.id}
        
        Participants:
        - Buyer: ${buyerEmail}
        - Seller: ${sellerEmail}
        
        Notes:
        ${meeting.notes || 'No additional notes provided.'}
        
        About the Puppies:
        ${listing.description || 'Details about the puppies will be shared during the meeting.'}
        
        —
        Pups4Sale Team
        `,

        start: {
          dateTime: start.toISOString(),
          timeZone: meeting.timezone || 'Asia/Kolkata',
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: meeting.timezone || 'Asia/Kolkata',
        },

        // ✅ ADD ATTENDEES (works with OAuth!)
        attendees: [
          { 
            email: sellerEmail, 
            responseStatus: 'needsAction'
          },
          { 
            email: buyerEmail, 
            responseStatus: 'needsAction'
          },
        ],

        // ✅ CREATE GOOGLE MEET LINK (works with OAuth!)
        conferenceData: {
          createRequest: {
            requestId: `meet-${meeting.id}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },

        // Additional settings
        reminders: {
          useDefault: true,
        }
      };

      // Create the event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1, // Enable Google Meet
      });

      const createdEvent = response.data;

      // Extract Google Meet link if created
      let googleMeetLink = meeting.googleMeetLink;
      if (createdEvent.conferenceData?.entryPoints?.length) {
        googleMeetLink = createdEvent.conferenceData.entryPoints[0].uri;
      }

      return {
        eventId: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        googleMeetLink,
        attendees: createdEvent.attendees,
        status: createdEvent.status,
      };

    } catch (error) {
      console.error('Error creating OAuth calendar event:', error);
      
      // Log more detailed error information
      if (error.response?.data?.error) {
        console.error('Google Calendar API Error Details:', {
          message: error.response.data.error.message,
          code: error.response.data.error.code,
          errors: error.response.data.error.errors
        });
      }
      
      throw error;
    }
  }

  /**
   * 📅 Check if user is available at the specified time
   */
  async checkAvailability(
    accessToken: string,
    date: string,
    time: string,
    duration: number,
    timezone: string
  ): Promise<boolean> {
    try {
      // Create a fresh OAuth2Client instance for this operation
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Build time range for the requested slot
      const startDateTime = `${date}T${time}:00`;
      const start = new Date(startDateTime);
      const end = new Date(start.getTime() + duration * 60000);

      console.log(`🔍 Checking calendar availability from ${start.toISOString()} to ${end.toISOString()}`);

      // Query user's calendar for events in this time range
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      // Filter out declined events and all-day events
      const conflictingEvents = events.filter(event => {
        // Skip all-day events
        if (event.start?.date) return false;
        
        // Skip declined events
        if (event.attendees?.some(attendee => 
          attendee.self && attendee.responseStatus === 'declined'
        )) return false;

        // Skip cancelled events
        if (event.status === 'cancelled') return false;

        return true;
      });

      if (conflictingEvents.length > 0) {
        console.log(`❌ Availability check failed - found ${conflictingEvents.length} conflicting events:`);
        conflictingEvents.forEach(event => {
          console.log(`   - ${event.summary} (${event.start?.dateTime} - ${event.end?.dateTime})`);
        });
        return false;
      }

      console.log('✅ User is available at the requested time');
      return true;

    } catch (error) {
      console.error('Error checking calendar availability:', error);
      
      // If it's an auth error, the user might need to re-authorize
      if (error.response?.status === 401) {
        console.log('🔑 Access token might be expired - availability check failed');
        return false; // Treat as unavailable if auth fails
      }
      
      // For other errors, assume available (graceful degradation)
      console.log('⚠️ Assuming available due to calendar API error');
      return true;
    }
  }

  /**
   * Update calendar event
   */
  async updateCalendarEvent(
    accessToken: string,
    eventId: string,
    updates: any
  ): Promise<any> {
    // Create a fresh OAuth2Client instance for this operation
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: updates,
      sendUpdates: 'all',
    });

    return response.data;
  }

  /**
   * Delete calendar event
   */
  async deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
    // Create a fresh OAuth2Client instance for this operation
    const oauth2Client = new google.auth.OAuth2(
     process.env.GOOGLE_CLIENT_ID,
     process.env.GOOGLE_CLIENT_SECRET,
     process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
  }

  /**
   * 📅 Get a calendar event by ID
   */
  async getCalendarEvent(accessToken: string, calendarId: string, eventId: string): Promise<any> {
    try {
      // Create a fresh OAuth2Client instance for this operation
      const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const response = await calendar.events.get({
        calendarId: calendarId,
        eventId: eventId,
      });

      console.log(`📅 Calendar event retrieved: ${eventId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error getting calendar event ${eventId}:`, error);
      return null;
    }
  }

  /**
   * 🔍 Test if an access token is valid by making a simple API call
   */
  async testTokenValidity(accessToken: string): Promise<boolean> {
    try {
      // Create a fresh OAuth2Client instance for this operation
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({ access_token: accessToken });
      
      // Make a simple API call to test token validity
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      console.log('Token validation successful for user:', userInfo.data.email);
      return true;
    } catch (error) {
      console.error('Token validation failed:', error.message);
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<any> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  /**
   * 🔄 Automatically refresh token if it's expired and retry the operation
   */
  async executeWithTokenRefresh<T>(
    accessToken: string,
    refreshToken: string | undefined,
    operation: (token: string) => Promise<T>
  ): Promise<T> {
    try {
      // First try with the current access token
      return await operation(accessToken);
    } catch (error: any) {
      // Check if it's an authentication error
      if (error.response?.status === 401 && refreshToken) {
        console.log('🔑 Access token expired, attempting to refresh...');
        
        try {
          // Refresh the token
          const newTokens = await this.refreshAccessToken(refreshToken);
          console.log('✅ Token refreshed successfully, retrying operation...');
          
          // Update the stored tokens in the database
          await this.updateStoredTokens(refreshToken, newTokens);
          
          // Retry the operation with the new token
          return await operation(newTokens.access_token);
        } catch (refreshError) {
          console.error('❌ Failed to refresh token:', refreshError);
          // Mark the refresh token as invalid to prevent repeated failures
          await this.markTokenAsInvalid(refreshToken);
          throw new Error('Access token expired and refresh failed. Please re-authorize.');
        }
      }
      
      // Re-throw the original error if it's not an auth error or no refresh token
      throw error;
    }
  }

  /**
   * Update stored tokens in the database after successful refresh
   */
  private async updateStoredTokens(oldRefreshToken: string, newTokens: any): Promise<void> {
    try {
      // Find user by refresh token and update their tokens
      const userTokens = await this.userCalendarTokensService.findByRefreshToken(oldRefreshToken);
      if (userTokens) {
        await this.userCalendarTokensService.updateTokensAfterRefresh(
          userTokens.userId,
          newTokens.access_token,
          newTokens.expiry_date
        );
      }
    } catch (error) {
      console.error('Failed to update stored tokens:', error);
    }
  }

  /**
   * Mark a refresh token as invalid to prevent repeated failures
   */
  private async markTokenAsInvalid(refreshToken: string): Promise<void> {
    try {
      // Find user by refresh token and mark their tokens as invalid
      const userTokens = await this.userCalendarTokensService.findByRefreshToken(refreshToken);
      if (userTokens) {
        await this.userCalendarTokensService.markTokensAsInvalid(userTokens.userId);
      }
    } catch (error) {
      console.error('Failed to mark token as invalid:', error);
    }
  }

  /**
   * 🔍 Check if we should attempt calendar sync (rate limiting and error tracking)
   */
  private shouldAttemptCalendarSync(userId: string): boolean {
    const now = Date.now();
    const lastAttempt = this.lastSyncAttempts.get(userId) || 0;
    const minInterval = 5 * 60 * 1000; // 5 minutes between attempts
    
    if (now - lastAttempt < minInterval) {
      return false;
    }
    
    this.lastSyncAttempts.set(userId, now);
    return true;
  }

  // Track last sync attempts to prevent spam
  private lastSyncAttempts = new Map<string, number>();
}
