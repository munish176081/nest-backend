import { CanActivate, ExecutionContext } from '@nestjs/common';
import { UsersService } from 'src/features/accounts/users.service';
import { SessionService } from 'src/features/authentication/session.service';
export declare class LoggedInGuard implements CanActivate {
    private readonly sessionService;
    private readonly usersService;
    constructor(sessionService: SessionService, usersService: UsersService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
