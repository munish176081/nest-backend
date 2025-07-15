import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class ActiveUserGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
