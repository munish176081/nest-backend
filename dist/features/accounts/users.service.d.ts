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
    verifyUser(userId: string): Promise<void>;
    resetPassword(userId: string, hashedPassword: string): Promise<User>;
    verifyUserByEmail(email: string): Promise<void>;
    migrateExistingUsers(): Promise<void>;
}
