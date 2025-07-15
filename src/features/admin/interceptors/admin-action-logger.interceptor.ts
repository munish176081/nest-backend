import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from '../services/activity-log.service';
import { LOG_ADMIN_ACTION_KEY, LogAdminActionOptions } from '../decorators/log-admin-action.decorator';
import { Request } from 'express';

@Injectable()
export class AdminActionLoggerInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activityLogService: ActivityLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOptions = this.reflector.get<LogAdminActionOptions>(
      LOG_ADMIN_ACTION_KEY,
      context.getHandler(),
    );

    if (!logOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const metadata: Record<string, any> = {};

          if (logOptions.includeRequest) {
            metadata.requestBody = request.body;
            metadata.requestParams = request.params;
            metadata.requestQuery = request.query;
          }

          if (logOptions.includeResponse) {
            metadata.response = response;
          }

          if (logOptions.includeUser) {
            metadata.user = {
              id: user.id,
              email: user.email,
              role: user.role,
            };
          }

          await this.activityLogService.logAdminAction(
            user,
            logOptions.action,
            undefined, // targetUser - can be extracted from request if needed
            metadata,
            request,
          );
        } catch (error) {
          // Don't let logging errors affect the main request
          console.error('Failed to log admin action:', error);
        }
      }),
    );
  }
} 