import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { AuthConfig } from './auth.config';

@Injectable()
export class OtpService {
  private cache: Redis;

  constructor(private readonly configService: ConfigService) {
    this.cache = new Redis(this.configService.get('redis.url'), {
      db: 1,
      ...(this.configService.get('cloudProvider') === 'heroku' && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    });
  }

  /**
   * Generate a random OTP of specified length
   */
  generateOtp(length: number = AuthConfig.OTP_LENGTH): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Store OTP in cache with expiry
   */
  async storeOtp(key: string, otp: string, expirySeconds: number = AuthConfig.OTP_EXPIRY_TIME): Promise<void> {
    console.log(key, "STORE KEY")
    await this.cache.set(key, otp, 'EX', expirySeconds);
  }

  /**
   * Get OTP from cache
   */
  async getOtp(key: string): Promise<string | null> {
    console.log(key, "STORE KEY")
    return await this.cache.get(key);
  }

  /**
   * Validate OTP
   */
  async validateOtp(key: string, providedOtp: string): Promise<boolean> {
    const storedOtp = await this.getOtp(key);
    console.log(storedOtp,key, "STORED ONE")
    if (!storedOtp) {
      return false;
    }
    
    const isValid = storedOtp === providedOtp;
    
    // Delete OTP after validation (one-time use)
    if (isValid) {
      await this.cache.del(key);
    }
    
    return isValid;
  }

  /**
   * Check if user can request new OTP (cooldown check)
   */
  async canRequestOtp(timeKey: string, cooldownSeconds: number = AuthConfig.OTP_COOLDOWN_PERIOD): Promise<boolean> {
    const lastRequestTime = await this.cache.get(timeKey);
    
    if (!lastRequestTime) {
      return true;
    }
    
    const timeSinceLastRequest = Date.now() / 1000 - parseInt(lastRequestTime);
    return timeSinceLastRequest >= cooldownSeconds;
  }

  /**
   * Set cooldown for OTP requests
   */
  async setOtpCooldown(timeKey: string, cooldownSeconds: number = AuthConfig.OTP_COOLDOWN_PERIOD): Promise<void> {
    await this.cache.set(timeKey, Date.now() / 1000, 'EX', cooldownSeconds);
  }

  /**
   * Get remaining cooldown time
   */
  async getRemainingCooldown(timeKey: string): Promise<number> {
    const lastRequestTime = await this.cache.get(timeKey);
    
    if (!lastRequestTime) {
      return 0;
    }
    
    const timeSinceLastRequest = Date.now() / 1000 - parseInt(lastRequestTime);
    const cooldownPeriod = AuthConfig.OTP_COOLDOWN_PERIOD;
    const remaining = Math.max(0, cooldownPeriod - timeSinceLastRequest);
    
    return Math.ceil(remaining);
  }

  /**
   * Delete OTP and related keys
   */
  async deleteOtp(key: string, timeKey?: string): Promise<void> {
    const keysToDelete = [key];
    if (timeKey) {
      keysToDelete.push(timeKey);
    }
    await this.cache.del(...keysToDelete);
  }
} 