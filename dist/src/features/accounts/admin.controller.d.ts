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
    getUsers(query: AdminUsersQuery): Promise<{
        users: import("./entities/account.entity").User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
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
}
export {};
