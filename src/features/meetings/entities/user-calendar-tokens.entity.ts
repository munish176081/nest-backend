import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_calendar_tokens')
@Index(['userId'], { unique: true }) // One token set per user
export class UserCalendarTokens {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ type: 'bigint', nullable: true })
  expiryDate?: number; // Unix timestamp

  @Column({ type: 'jsonb', nullable: true })
  scope?: string[]; // Granted OAuth scopes

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  calendarId?: string; // Primary calendar ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Check if access token is expired
   */
  isTokenExpired(): boolean {
    if (!this.expiryDate) return false;
    return Date.now() >= this.expiryDate;
  }

  /**
   * Check if tokens have required scopes for calendar operations
   */
  hasCalendarScopes(): boolean {
    if (!this.scope) return false;
    
    const requiredScopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    
    return requiredScopes.every(scope => this.scope!.includes(scope));
  }
}
