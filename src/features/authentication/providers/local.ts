import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { createUserTokenData } from 'src/helpers/createUserTokenData';
import { AuthService } from '../authentication.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'usernameOrEmail',
      passwordField: 'password',
    });
  }

  async validate(usernameOrEmail: string, password: string) {
    const user = await this.authService.validateUser(usernameOrEmail, password);
    return createUserTokenData(user);
  }
}
