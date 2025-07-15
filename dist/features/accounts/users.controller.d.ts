import { Request } from 'express';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findCurrenUser(req: Request): Promise<{
        id: string;
        email: string;
        name: string;
        username: string;
        status: import("./entities/account.entity").UserStatusEnum;
        imageUrl: string;
        createdAt: string;
    }>;
    getUserListings(req: Request): Promise<void>;
    getUserListing(req: Request, id: string): Promise<void>;
    refreshSession(req: Request): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            name: string;
            username: string;
            status: import("./entities/account.entity").UserStatusEnum;
            imageUrl: string;
            createdAt: string;
        };
    }>;
    migrateUsers(): Promise<{
        message: string;
    }>;
}
