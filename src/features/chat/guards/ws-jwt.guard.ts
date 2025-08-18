import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UsersService } from '../../accounts/users.service';
import { SessionService } from '../../authentication/session.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const sessionId = this.extractSessionId(client);

      if (!sessionId) {
        throw new WsException('Session ID not provided');
      }

      // Verify session and get user
      const user = await this.verifySession(sessionId);
      if (!user) {
        throw new WsException('Invalid session');
      }

      // Attach user to socket for later use
      (client as any).userId = user.id;
      (client as any).user = user;

      return true;
    } catch (error) {
      this.logger.error('WebSocket authentication failed:', error);
      throw new WsException('Authentication failed');
    }
  }

  private extractSessionId(client: Socket): string | null {
    // Try to get session ID from handshake auth first
    if (client.handshake.auth?.sessionId) {
      return client.handshake.auth.sessionId;
    }

    // Fallback to headers
    if (client.handshake.headers?.sessionid) {
      return client.handshake.headers.sessionid as string;
    }

    // Try to get from cookies
    if (client.handshake.headers?.cookie) {
      const cookies = client.handshake.headers.cookie;
      const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
      if (sessionMatch) {
        return sessionMatch[1];
      }
    }

    return null;
  }

  private async verifySession(sessionId: string): Promise<any> {
    try {
      // For now, we'll use a simple approach
      // In a production environment, you'd want to verify the session with Redis
      // This is a placeholder - you should implement proper session verification
      
      // For development/testing, you can pass a userId directly
      if (sessionId.startsWith('user:')) {
        const userId = sessionId.replace('user:', '');
        const user = await this.usersService.getUserById(userId);
        return user;
      }

      // TODO: Implement proper session verification with Redis
      // const sessionData = await this.sessionService.getSession(sessionId);
      // return sessionData?.user;

      return null;
    } catch (error) {
      this.logger.error('Session verification failed:', error);
      return null;
    }
  }
} 