import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { User } from '../accounts/entities/account.entity';
import { createUserTokenData } from 'src/helpers/createUserTokenData';


@Injectable()
export class SessionService {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(this.configService.get('redis.url'), {
      db: 1,
      ...(this.configService.get('cloudProvider') === 'heroku' && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    });
  }

  /**
   * Updates the session data for a specific user
   * This is called whenever user data changes in the database
   */
  async updateUserSession(userId: string, user: User): Promise<void> {
    try {
      // Use SCAN instead of KEYS for better performance
      let cursor = '0';
      const pattern = 'sess:*';
      
      do {
        const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = newCursor;
        
        for (const sessionKey of keys) {
          await this.updateSessionIfContainsUser(sessionKey, userId, user);
        }
      } while (cursor !== '0');
      
    } catch (error) {
      console.error('Error updating user session:', error);
    }
  }

  /**
   * Invalidates all sessions for a specific user
   * This is called when a user is suspended or deleted
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      let cursor = '0';
      const pattern = 'sess:*';
      const sessionsToDelete: string[] = [];
      
      do {
        const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = newCursor;
        
        for (const sessionKey of keys) {
          const containsUser = await this.sessionContainsUser(sessionKey, userId);
          if (containsUser) {
            sessionsToDelete.push(sessionKey);
          }
        }
      } while (cursor !== '0');
      
      // Delete all sessions for the user
      if (sessionsToDelete.length > 0) {
        await this.redis.del(...sessionsToDelete);
        console.log(`Invalidated ${sessionsToDelete.length} sessions for user ${userId}`);
      }
    } catch (error) {
      console.error('Error invalidating user sessions:', error);
    }
  }

  /**
   * Gets the current user data from the database and updates the session
   * This is called by the guard to ensure fresh data
   */
  async refreshUserSession(userId: string, user: User): Promise<void> {
    await this.updateUserSession(userId, user);
  }

  /**
   * Gets session data by session ID
   * This is used for WebSocket authentication
   */
  async getSession(sessionId: string): Promise<any> {
    try {
      const sessionKey = `sess:${sessionId}`;
      const sessionData = await this.redis.get(sessionKey);
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Verifies if a session is valid and returns the user data
   * This is used for WebSocket authentication
   */
  async verifySession(sessionId: string): Promise<any> {
    try {
      const session = await this.getSession(sessionId);
      
      if (session && session.passport?.user) {
        return session.passport.user;
      }
      
      return null;
    } catch (error) {
      console.error('Error verifying session:', error);
      return null;
    }
  }

  /**
   * Helper method to update a specific session if it contains the target user
   */
  private async updateSessionIfContainsUser(sessionKey: string, userId: string, user: User): Promise<void> {
    try {
      const sessionData = await this.redis.get(sessionKey);
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Check if this session contains the user we want to update
        if (session.passport?.user?.id === userId) {
          // Update the user data in the session
          const updatedUserData = createUserTokenData(user);
          session.passport.user = updatedUserData;
          
          // Save the updated session back to Redis
          await this.redis.set(sessionKey, JSON.stringify(session));
          
          console.log(`Updated session ${sessionKey} for user ${userId}`);
        }
      }
    } catch (parseError) {
      // Skip sessions that can't be parsed
      console.warn(`Failed to parse session ${sessionKey}:`, parseError);
    }
  }

  /**
   * Helper method to check if a session contains a specific user
   */
  private async sessionContainsUser(sessionKey: string, userId: string): Promise<boolean> {
    try {
      const sessionData = await this.redis.get(sessionKey);
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.passport?.user?.id === userId;
      }
    } catch (parseError) {
      console.warn(`Failed to parse session ${sessionKey}:`, parseError);
    }
    
    return false;
  }
} 