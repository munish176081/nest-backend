import { IsEmail, IsString } from "class-validator";

export class SubscribeDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}