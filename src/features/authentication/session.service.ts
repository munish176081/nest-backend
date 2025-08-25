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
      db: 0, // Use the same database as express-session
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
      console.log('SessionService: Original sessionId received:', sessionId);
      console.log('SessionService: Session ID type:', typeof sessionId);
      console.log('SessionService: Session ID length:', sessionId?.length);
      
      // Try to decode the sessionId if it's URL encoded
      let decodedSessionId = sessionId;
      try {
        if (sessionId && typeof sessionId === 'string') {
          decodedSessionId = decodeURIComponent(sessionId);
          if (decodedSessionId !== sessionId) {
            console.log('SessionService: SessionId was URL encoded, decoded to:', decodedSessionId);
          }
        }
      } catch (decodeError) {
        console.log('SessionService: Could not decode sessionId, using as-is');
        decodedSessionId = sessionId;
      }
      
      // Try different session ID formats
      let sessionKeys = [];
      
      // Format 1: Direct session ID (most common)
      sessionKeys.push(`sess:${decodedSessionId}`);
      
      // Format 2: If sessionId starts with 's:', try without it
      if (decodedSessionId && decodedSessionId.startsWith('s:')) {
        sessionKeys.push(`sess:${decodedSessionId.substring(2)}`);
      }
      
      // Format 3: If sessionId contains a dot, try the part before the dot (signature removal)
      if (decodedSessionId && decodedSessionId.includes('.')) {
        const beforeDot = decodedSessionId.split('.')[0];
        sessionKeys.push(`sess:${beforeDot}`);
      }
      
      // Format 4: If sessionId starts with 's:' and contains a dot, try both combinations
      if (decodedSessionId && decodedSessionId.startsWith('s:') && decodedSessionId.includes('.')) {
        const withoutPrefix = decodedSessionId.substring(2);
        const beforeDot = withoutPrefix.split('.')[0];
        sessionKeys.push(`sess:${beforeDot}`);
      }
      
      // Format 5: Try with the original sessionId as-is (in case it's already the full key)
      if (decodedSessionId && !decodedSessionId.startsWith('sess:')) {
        sessionKeys.push(`sess:${decodedSessionId}`);
      }
      
      // Format 6: If sessionId already starts with 'sess:', use it directly
      if (decodedSessionId && decodedSessionId.startsWith('sess:')) {
        sessionKeys.push(decodedSessionId);
      }
      
      // Format 7: Try the sessionId as-is (in case it's a complete key without 'sess:' prefix)
      if (decodedSessionId && !decodedSessionId.startsWith('sess:')) {
        // This might be the case where the sessionId is the actual Redis key
        sessionKeys.push(decodedSessionId);
      }
      
      console.log('SessionService: Trying session keys:', sessionKeys);
      
      // Try each key format
      for (const sessionKey of sessionKeys) {
        console.log('SessionService: Trying Redis key:', sessionKey);
        const sessionData = await this.redis.get(sessionKey);
        
        if (sessionData) {
          console.log('SessionService: Found session data with key:', sessionKey);
          const session = JSON.parse(sessionData);
          console.log('SessionService: Parsed session:', session);
          return session;
        }
      }
      
      // If no session found, let's see what keys exist in Redis
      const allSessionKeys = await this.redis.keys('sess:*');
      console.log('SessionService: All available session keys in Redis:', allSessionKeys.slice(0, 10));
      
      // Let's also check if there are any keys that might match our sessionId
      if (decodedSessionId) {
        const matchingKeys = allSessionKeys.filter(key => 
          key.includes(decodedSessionId) || 
          key.includes(decodedSessionId.replace('s:', '')) ||
          key.includes(decodedSessionId.split('.')[0])
        );
        console.log('SessionService: Potentially matching keys:', matchingKeys);
      }
      
      console.log('SessionService: No session data found in Redis');
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
      console.log('SessionService: Verifying session ID:', sessionId);
      console.log('SessionService: Session ID type:', typeof sessionId);
      console.log('SessionService: Session ID length:', sessionId?.length);
      
      const session = await this.getSession(sessionId);
      console.log('SessionService: Raw session data:', session.passport.user);
      
      if (session && session.passport?.user) {
        return session.passport.user;
      }
      
      console.log('SessionService: No valid user found in session');
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