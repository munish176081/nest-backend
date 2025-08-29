import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateMeetingDto {
  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsNumber()
  @Min(15)
  @Max(180)
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
