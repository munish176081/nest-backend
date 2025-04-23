import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  imageUrl: string;

  @Expose()
  createdAt: string;

  @Expose()
  status: string;
}
