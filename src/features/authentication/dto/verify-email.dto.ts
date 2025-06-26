import { IsString, IsUUID } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  token: string;

  @IsString()
  @IsUUID()
  userId: string;
}
