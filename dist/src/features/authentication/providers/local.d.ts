import { AuthService } from '../authentication.service';
declare const LocalStrategy_base: new (...args: any[]) => any;
export declare class LocalStrategy extends LocalStrategy_base {
    private readonly authService;
    constructor(authService: AuthService);
    validate(usernameOrEmail: string, password: string): Promise<{
        id: string;
        email: string;
        name: string;
        username: string;
        status: import("../../accounts/entities/account.entity").UserStatusEnum;
        imageUrl: string;
        createdAt: string;
        role: import("../../accounts/entities/account.entity").UserRoleEnum;
        isSuperAdmin: boolean;
    }>;
}
export {};
