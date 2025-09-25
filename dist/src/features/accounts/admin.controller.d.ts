import { Request, Response } from 'express';
import { UsersService } from './users.service';
interface AdminUsersQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'user' | 'admin' | 'super_admin';
}
interface AdminStatusUpdateDto {
    status: 'active' | 'suspended' | 'not_verified';
}
interface AdminRoleUpdateDto {
    email: string;
    role: 'user' | 'admin' | 'super_admin';
}
export declare class AdminController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getUsers(query: AdminUsersQuery, res: Response): Promise<Response<any, Record<string, any>>>;
    searchUsers(search: string, query: AdminUsersQuery): Promise<{
        users: import("./entities/account.entity").User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUsersByRole(role: 'user' | 'admin' | 'super_admin', query: AdminUsersQuery): Promise<{
        users: import("./entities/account.entity").User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUser(id: string): Promise<import("./entities/account.entity").User>;
    updateUserStatus(id: string, statusUpdate: AdminStatusUpdateDto): Promise<import("./entities/account.entity").User>;
    updateUserRole(id: string, roleUpdate: AdminRoleUpdateDto): Promise<import("./entities/account.entity").User>;
    deleteUser(id: string): Promise<{
        message: string;
    }>;
    getDashboardStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        suspendedUsers: number;
        unverifiedUsers: number;
        superAdmins: number;
        admins: number;
        regularUsers: number;
    }>;
    getCurrentUserDebug(req: Request): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            name: string;
            username: string;
            status: import("./entities/account.entity").UserStatusEnum;
            imageUrl: string;
            createdAt: string;
            role: import("./entities/account.entity").UserRoleEnum;
            isSuperAdmin: boolean;
        };
        isAuthenticated: boolean;
        session: import("express-session").Session & Partial<import("express-session").SessionData>;
        headers: {
            authorization: string;
            cookie: string;
        };
    }>;
    getUsersRaw(query: AdminUsersQuery): Promise<{
        message: string;
        query: {
            page: number;
            limit: number;
            search: string;
            role: "user" | "admin" | "super_admin";
        };
        result: {
            users: import("./entities/account.entity").User[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        usersCount: number;
        total: number;
        error?: undefined;
        stack?: undefined;
    } | {
        message: string;
        error: any;
        stack: any;
        query?: undefined;
        result?: undefined;
        usersCount?: undefined;
        total?: undefined;
    }>;
}
export {};
