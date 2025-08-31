import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Controller('meetings')
@UseGuards(LoggedInGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  async createMeeting(@Body() body: CreateMeetingDto & { access_token?: string; refresh_token?: string }, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const { access_token, refresh_token, ...createMeetingDto } = body;
    return this.meetingsService.createMeeting(createMeetingDto, userId, access_token, refresh_token);
  }

  @Get()
  async getUserMeetings(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.meetingsService.getUserMeetings(userId);
  }

  @Get('available-slots')
  async getAvailableSlots(
    @Query('listingId') listingId: string,
    @Query('date') date: string,
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    if (!listingId || !date) {
      throw new BadRequestException('listingId and date are required');
    }

    return this.meetingsService.getAvailableSlots(listingId, date, userId);
  }

  @Get('listing/:listingId')
  async getListingMeetings(@Param('listingId') listingId: string, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.meetingsService.getListingMeetings(listingId, userId);
  }

  @Get(':id')
  async getMeeting(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.meetingsService.getMeeting(id, userId);
  }

  @Put(':id')
  async updateMeeting(
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.meetingsService.updateMeeting(id, updateMeetingDto, userId);
  }

  @Put(':id/confirm')
  async confirmMeeting(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.meetingsService.confirmMeeting(id, userId);
  }

  @Put(':id/reject')
  async rejectMeeting(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.meetingsService.rejectMeeting(id, userId);
  }

  @Put(':id/cancel')
  async cancelMeeting(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.meetingsService.cancelMeeting(id, userId);
  }
}
