import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
export declare class MeetingsController {
    private readonly meetingsService;
    constructor(meetingsService: MeetingsService);
    createMeeting(body: CreateMeetingDto & {
        access_token?: string;
        refresh_token?: string;
    }, req: any): Promise<import("./entities/meeting.entity").Meeting>;
    getUserMeetings(req: any): Promise<import("./dto").MeetingResponseDto[]>;
    getAvailableSlots(listingId: string, date: string, req: any): Promise<string[]>;
    getListingMeetings(listingId: string, req: any): Promise<import("./dto").MeetingResponseDto[]>;
    getMeeting(id: string, req: any): Promise<import("./entities/meeting.entity").Meeting>;
    updateMeeting(id: string, updateMeetingDto: UpdateMeetingDto, req: any): Promise<import("./entities/meeting.entity").Meeting>;
    confirmMeeting(id: string, req: any): Promise<import("./entities/meeting.entity").Meeting>;
    rejectMeeting(id: string, req: any): Promise<import("./entities/meeting.entity").Meeting>;
    cancelMeeting(id: string, req: any): Promise<import("./entities/meeting.entity").Meeting>;
}
