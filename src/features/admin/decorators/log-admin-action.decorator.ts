import { SetMetadata } from '@nestjs/common';

export const LOG_ADMIN_ACTION_KEY = 'logAdminAction';

export interface LogAdminActionOptions {
  action: string;
  description?: string;
  level?: 'info' | 'warning' | 'error' | 'critical';
  includeRequest?: boolean;
  includeResponse?: boolean;
  includeUser?: boolean;
}

export const LogAdminAction = (options: LogAdminActionOptions) =>
  SetMetadata(LOG_ADMIN_ACTION_KEY, options); 