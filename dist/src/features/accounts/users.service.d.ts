import { Repository } from 'typeorm';
import { User } from './entities/account.entity';
import { SessionService } from '../authentication/session.service';
export declare class UsersService {
    private readonly userRepo;
    private readonly sessionService;
    constructor(userRepo: Repository<User>, sessionService: SessionService);
    createByAccount({ email, imageUrl, ip, firstName, lastName, }: {
        email: string;
        imageUrl?: string;
        ip?: string;
        firstName?: string;
        lastName?: string;
    }): Promise<User>;
    generateUsername(firstName?: string, lastName?: string, randomNumber?: string): any;
    generateUsernameFromName(name: string, randomNumber?: string): any;
    getBy({ email }: {
        email: string;
    }): Promise<User>;
    getExistByUsernameOrEmail({ username, email, }: {
        username?: string;
        email?: string;
    }): Promise<User>;
    create(createUser: {
        email: string;
        username: string;
        hashedPassword: string;
        ip?: string;
    }): Promise<User>;
    validateAndGetUser(usernameOrEmail: string): Promise<User>;
    getUsersForAdmin({ page, limit, search, role }: {
        page?: number;
        limit?: number;
        search?: string;
        role?: 'user' | 'admin' | 'super_admin';
    }): Promise<{
        users: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    searchUsersForAdmin({ page, limit, search }: {
        page?: number;
        limit?: number;
        search: string;
    }): Promise<{
        users: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUsersByRoleForAdmin({ page, limit, role }: {
        page?: number;
        limit?: number;
        role: 'user' | 'admin' | 'super_admin';
    }): Promise<{
        users: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUserById(id: string): Promise<User>;
    getUserByUsername(username: string): Promise<User>;
    updateUserStatus(id: string, status: 'active' | 'suspended' | 'not_verified'): Promise<User>;
    updateUserRole(id: string, roleUpdate: {
        email: string;
        role: 'user' | 'admin' | 'super_admin';
    }): Promise<User>;
    updateUserProfile(userId: string, updateData: {
        name: string;
        username?: string;
        email: string;
        imageUrl?: string;
        phone: string;
        bio?: string;
        website?: string;
        businessName: string;
        businessABN: string;
        description: string;
        location: string;
        idVerification?: {
            governmentId: string[];
            selfieWithId: string[];
        };
    }): Promise<User>;
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
    verifyUser(userId: string): Promise<void>;
    resetPassword(userId: string, hashedPassword: string): Promise<User>;
    verifyUserByEmail(email: string): Promise<void>;
    migrateExistingUsers(): Promise<void>;
}
