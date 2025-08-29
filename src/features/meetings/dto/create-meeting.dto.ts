import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsNumber()
  @Min(15)
  @Max(180)
  duration: number;

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
