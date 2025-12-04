import { ExecutionContext } from '@nestjs/common';
declare const CustomAuthGuard: (type?: string | string[]) => {
    new (...args: any[]): {
        handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser;
        canActivate(context: ExecutionContext): boolean | Promise<boolean> | import("rxjs").Observable<boolean>;
        logIn<TRequest extends {
            logIn: Function;
        } = any>(request: TRequest): Promise<void>;
        getAuthenticateOptions(context: ExecutionContext): import("@nestjs/passport").IAuthModuleOptions | undefined;
        getRequest(context: ExecutionContext): any;
    };
    apply(this: Function, thisArg: any, argArray?: any): any;
    call(this: Function, thisArg: any, ...argArray: any[]): any;
    bind(this: Function, thisArg: any, ...argArray: any[]): any;
    toString(): string;
    readonly length: number;
    arguments: any;
    caller: Function;
    readonly name: string;
    [Symbol.hasInstance](value: any): boolean;
};
export { CustomAuthGuard as AuthGuard };
