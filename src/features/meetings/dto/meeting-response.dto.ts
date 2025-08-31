import { Expose } from 'class-transformer';

export class MeetingResponseDto {
  @Expose()
  id: string;

  @Expose()
  listingId: string;

  @Expose()
  listingTitle: string;

  @Expose()
  listingType: string;

  @Expose()
  buyerId: string;

  @Expose()
  buyerName: string;

  @Expose()
  buyerEmail: string;

  @Expose()
  sellerId: string;

  @Expose()
  sellerName: string;

  @Expose()
  sellerEmail: string;

  @Expose()
  date: string;

  @Expose()
  time: string;

  @Expose()
  duration: number;

  @Expose()
  timezone: string;

  @Expose()
  status: string;

  @Expose()
  googleMeetLink?: string;

  @Expose()
  calendarEventId?: string;

  @Expose()
  notes?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
