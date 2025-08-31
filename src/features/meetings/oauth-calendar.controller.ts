import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { OAuthCalendarService } from './oauth-calendar.service';
import { UserCalendarTokensService } from './user-calendar-tokens.service';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';

@Controller('calendar')
export class OAuthCalendarController {
  constructor(
    private readonly oauthCalendarService: OAuthCalendarService,
    private readonly userCalendarTokensService: UserCalendarTokensService,
  ) {}

  /**
   * Step 1: Get Google OAuth authorization URL
   * Frontend redirects user to this URL to authorize calendar access
   */
  @Get('auth-url')
  getAuthUrl() {
    const authUrl = this.oauthCalendarService.getAuthUrl();
    return {
      authUrl,
      message: 'Redirect user to this URL to authorize calendar access',
    };
  }

  /**
   * Step 2: Handle OAuth callback and exchange code for tokens
   * This endpoint receives the authorization code from Google
   */
  @Post('oauth-callback')
  @UseGuards(LoggedInGuard)
  async handleOAuthCallback(
    @Body() body: { code: string },
    @Request() req
  ) {
    const { code } = body;
    const userId = req.user?.id;
    
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    try {
      const tokens = await this.oauthCalendarService.getAccessToken(code);
      
      // Store tokens in database for this user
      await this.userCalendarTokensService.storeTokens(
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date,
        tokens.scope,
        'primary' // Default to primary calendar
      );
      
      return {
        success: true,
        message: 'Calendar access authorized and tokens stored successfully',
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        },
        instructions: {
          next_steps: [
            'Tokens have been stored securely in the database',
            'You can now create meetings with calendar integration',
            'Access tokens will be refreshed automatically when needed'
          ]
        }
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new BadRequestException('Failed to authorize calendar access');
    }
  }

  /**
   * Step 3: Create calendar event with full functionality
   * This uses the user's OAuth token instead of service account
   */
  @Post('create-event')
  @UseGuards(LoggedInGuard)
  async createCalendarEvent(
    @Body() body: {
      access_token: string;
      meeting: any;
      listing: any;
      buyer_email: string;
      seller_email: string;
    },
    @Request() req
  ) {
    const { access_token, meeting, listing, buyer_email, seller_email } = body;

    if (!access_token) {
      throw new BadRequestException('Access token is required');
    }

    try {
      const result = await this.oauthCalendarService.createCalendarEventWithOAuth(
        access_token,
        meeting,
        listing,
        buyer_email,
        seller_email
      );

      return {
        success: true,
        message: 'Calendar event created successfully with full functionality',
        event: result,
        features_enabled: [
          '✅ Attendees automatically invited',
          '✅ Google Meet link generated',
          '✅ Email notifications sent',
          '✅ Event created in user\'s calendar',
          '✅ Reminders configured'
        ]
      };
    } catch (error) {
      console.error('Calendar event creation failed:', error);
      throw new BadRequestException('Failed to create calendar event');
    }
  }

  /**
   * Get user's stored calendar tokens
   */
  @Get('tokens')
  @UseGuards(LoggedInGuard)
  async getUserTokens(@Request() req) {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    try {
      const tokens = await this.userCalendarTokensService.getTokens(userId);
      
      if (!tokens) {
        return {
          success: false,
          message: 'No calendar tokens found',
          tokens: null
        };
      }

      return {
        success: true,
        message: 'Calendar tokens retrieved successfully',
        tokens: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expiry_date: tokens.expiryDate,
          scope: tokens.scope,
          calendar_id: tokens.calendarId
        }
      };
    } catch (error) {
      console.error('Error getting user tokens:', error);
      throw new BadRequestException('Failed to retrieve calendar tokens');
    }
  }

  /**
   * Refresh expired access token
   */
  @Post('refresh-token')
  @UseGuards(LoggedInGuard)
  async refreshToken(@Body() body: { refresh_token: string }, @Request() req) {
    const { refresh_token } = body;
    const userId = req.user?.id;

    if (!refresh_token) {
      throw new BadRequestException('Refresh token is required');
    }

    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    try {
      const newTokens = await this.oauthCalendarService.refreshAccessToken(refresh_token);
      
      // Update stored tokens
      await this.userCalendarTokensService.storeTokens(
        userId,
        newTokens.access_token,
        newTokens.refresh_token,
        newTokens.expiry_date
      );
      
      return {
        success: true,
        message: 'Access token refreshed successfully',
        tokens: {
          access_token: newTokens.access_token,
          expiry_date: newTokens.expiry_date,
        }
      };
    } catch (error) {
      throw new BadRequestException('Failed to refresh access token');
    }
  }

  /**
   * Test endpoint to verify OAuth calendar functionality
   */
  @Post('test-oauth')
  @UseGuards(LoggedInGuard)
  async testOAuthCalendar(@Body() body: { access_token: string }) {
    const { access_token } = body;

    if (!access_token) {
      throw new BadRequestException('Access token is required');
    }

    // Create a test meeting
    const testMeeting = {
      id: 'oauth-test-' + Date.now(),
      date: '2024-12-21',
      time: '15:00',
      duration: 45,
      timezone: 'Asia/Kolkata',
      notes: 'OAuth calendar integration test - this event will be deleted automatically'
    };

    const testListing = {
      title: 'OAuth Test - Golden Retriever Puppies',
      description: 'Testing OAuth calendar integration functionality'
    };

    try {
      const result = await this.oauthCalendarService.createCalendarEventWithOAuth(
        access_token,
        testMeeting,
        testListing,
        'test-buyer@example.com',
        'test-seller@example.com'
      );

      // Clean up - delete the test event
      setTimeout(async () => {
        try {
          await this.oauthCalendarService.deleteCalendarEvent(access_token, result.eventId);
          console.log('Test event cleaned up successfully');
        } catch (error) {
          console.error('Failed to clean up test event:', error);
        }
      }, 5000); // Delete after 5 seconds

      return {
        success: true,
        message: 'OAuth calendar integration test successful!',
        test_result: result,
        note: 'Test event will be automatically deleted in 5 seconds'
      };
    } catch (error) {
      console.error('OAuth test failed:', error);
      throw new BadRequestException('OAuth calendar test failed');
    }
  }
}
