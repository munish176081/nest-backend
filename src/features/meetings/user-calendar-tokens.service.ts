import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCalendarTokens } from './entities/user-calendar-tokens.entity';

@Injectable()
export class UserCalendarTokensService {
  constructor(
    @InjectRepository(UserCalendarTokens)
    private userCalendarTokensRepository: Repository<UserCalendarTokens>,
  ) {}

  /**
   * Store or update user's calendar tokens
   */
  async storeTokens(
    userId: string,
    accessToken: string,
    refreshToken?: string,
    expiryDate?: number,
    scope?: string[],
    calendarId?: string
  ): Promise<UserCalendarTokens> {
    try {
      // Check if user already has tokens
      let userTokens = await this.userCalendarTokensRepository.findOne({
        where: { userId }
      });

      if (userTokens) {
        // Update existing tokens
        userTokens.accessToken = accessToken;
        userTokens.refreshToken = refreshToken || userTokens.refreshToken;
        userTokens.expiryDate = expiryDate || userTokens.expiryDate;
        userTokens.scope = scope || userTokens.scope;
        userTokens.calendarId = calendarId || userTokens.calendarId;
        userTokens.isActive = true;
        userTokens.updatedAt = new Date();
      } else {
        // Create new tokens
        userTokens = this.userCalendarTokensRepository.create({
          userId,
          accessToken,
          refreshToken,
          expiryDate,
          scope,
          calendarId,
          isActive: true,
        });
      }

      return await this.userCalendarTokensRepository.save(userTokens);
    } catch (error) {
      console.error('Error storing calendar tokens:', error);
      throw new BadRequestException('Failed to store calendar tokens');
    }
  }

  /**
   * Get user's calendar tokens
   */
  async getTokens(userId: string): Promise<UserCalendarTokens | null> {
    try {
      const tokens = await this.userCalendarTokensRepository.findOne({
        where: { userId, isActive: true }
      });

      if (!tokens) {
        return null;
      }

      // Note: Token refresh is handled by the calling service to avoid circular dependencies
      return tokens;
    } catch (error) {
      console.error('Error retrieving calendar tokens:', error);
      return null;
    }
  }

  /**
   * Get valid access token for user (with automatic refresh)
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    const tokens = await this.getTokens(userId);
    return tokens?.accessToken || null;
  }

  /**
   * Update tokens after successful refresh
   */
  async updateTokensAfterRefresh(
    userId: string,
    newAccessToken: string,
    newExpiryDate?: number
  ): Promise<void> {
    try {
      const tokens = await this.userCalendarTokensRepository.findOne({
        where: { userId, isActive: true }
      });

      if (tokens) {
        tokens.accessToken = newAccessToken;
        if (newExpiryDate) {
          tokens.expiryDate = newExpiryDate;
        }
        tokens.updatedAt = new Date();
        await this.userCalendarTokensRepository.save(tokens);
        console.log(`✅ Updated tokens for user ${userId} after refresh`);
      }
    } catch (error) {
      console.error('Error updating tokens after refresh:', error);
    }
  }

  /**
   * Find user tokens by refresh token
   */
  async findByRefreshToken(refreshToken: string): Promise<UserCalendarTokens | null> {
    try {
      return await this.userCalendarTokensRepository.findOne({
        where: { refreshToken, isActive: true }
      });
    } catch (error) {
      console.error('Error finding tokens by refresh token:', error);
      return null;
    }
  }

  /**
   * Mark tokens as invalid to prevent repeated failures
   */
  async markTokensAsInvalid(userId: string): Promise<void> {
    try {
      const tokens = await this.userCalendarTokensRepository.findOne({
        where: { userId, isActive: true }
      });

      if (tokens) {
        tokens.isActive = false;
        tokens.updatedAt = new Date();
        await this.userCalendarTokensRepository.save(tokens);
        console.log(`🚫 Marked tokens as invalid for user ${userId}`);
      }
    } catch (error) {
      console.error('Error marking tokens as invalid:', error);
    }
  }

  /**
   * Revoke user's calendar access
   */
  async revokeAccess(userId: string): Promise<void> {
    try {
      const tokens = await this.userCalendarTokensRepository.findOne({
        where: { userId }
      });

      if (tokens) {
        tokens.isActive = false;
        await this.userCalendarTokensRepository.save(tokens);
      }
    } catch (error) {
      console.error('Error revoking calendar access:', error);
    }
  }

  /**
   * Check if user has active calendar integration
   */
  async hasActiveIntegration(userId: string): Promise<boolean> {
    const tokens = await this.getTokens(userId);
    return !!tokens && tokens.isActive;
  }

  /**
   * Get all users with active calendar integration
   */
  async getUsersWithActiveIntegration(): Promise<string[]> {
    try {
      const tokens = await this.userCalendarTokensRepository.find({
        where: { isActive: true },
        select: ['userId']
      });
      
      return tokens.map(token => token.userId);
    } catch (error) {
      console.error('Error getting users with active integration:', error);
      return [];
    }
  }
}
