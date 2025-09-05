import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { Observable } from 'rxjs';
export declare class SerializeInterceptor implements NestInterceptor {
    private dto;
    constructor(dto: ClassConstructor<unknown>);
    intercept(_context: ExecutionContext, next: CallHandler): Observable<any>;
}
export declare function Serialize(dto: ClassConstructor<unknown>): MethodDecorator & ClassDecorator;
