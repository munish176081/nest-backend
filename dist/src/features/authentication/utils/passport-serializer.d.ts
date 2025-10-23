import { PassportSerializer } from '@nestjs/passport';
export declare class SessionSerializer extends PassportSerializer {
    constructor();
    serializeUser(user: any, done: any): void;
    deserializeUser(payload: any, done: any): void;
}
