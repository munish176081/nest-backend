import { CanActivate, ExecutionContext } from '@nestjs/common';
import { UsersService } from '../../accounts/users.service';
import { SessionService } from '../../authentication/session.service';
export declare class WsJwtGuard implements CanActivate {
    private readonly usersService;
    private readonly sessionService;
    private readonly logger;
    constructor(usersService: UsersService, sessionService: SessionService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractSessionId;
    private verifySession;
}
