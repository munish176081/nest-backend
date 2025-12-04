"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const account_entity_1 = require("./entities/account.entity");
const session_service_1 = require("../authentication/session.service");
let UsersService = class UsersService {
    constructor(userRepo, sessionService) {
        this.userRepo = userRepo;
        this.sessionService = sessionService;
    }
    async createByAccount({ email, imageUrl, ip, firstName, lastName, }) {
        const userExist = await this.getExistByUsernameOrEmail({ email });
        if (userExist) {
            if (userExist.externalAccounts.length > 0)
                throw new common_1.BadRequestException('User already exists with this email');
            if (userExist.status === 'suspended')
                throw new common_1.UnauthorizedException('User is suspended');
            if (userExist.status === 'not_verified' ||
                (imageUrl && !userExist.imageUrl)) {
                if (userExist.status === 'not_verified') {
                    userExist.status = 'active';
                }
                if (imageUrl && !userExist.imageUrl) {
                    userExist.imageUrl = imageUrl;
                }
                const updatedUser = await this.userRepo.save(userExist);
                try {
                    await this.sessionService.updateUserSession(updatedUser.id, updatedUser);
                }
                catch (error) {
                    console.error('Error updating session after user data changes:', error);
                }
                return updatedUser;
            }
            return userExist;
        }
        const name = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
        const username = await this.generateUsername(firstName, lastName);
        const user = this.userRepo.create({
            name,
            username,
            ip,
            email,
            imageUrl,
            status: 'active',
        });
        return this.userRepo.save(user);
    }
    async generateUsername(firstName = '', lastName = '', randomNumber = '') {
        const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNumber ? `_${randomNumber}` : ''}`;
        const isUsernameExists = await this.userRepo.findOneBy({
            username: (0, typeorm_2.ILike)(username),
        });
        if (isUsernameExists) {
            return this.generateUsername(firstName, lastName, `${randomNumber}${Math.trunc(Math.random() * 100)}`);
        }
        return username;
    }
    async generateUsernameFromName(name, randomNumber = '') {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const username = `${cleanName}${randomNumber ? `_${randomNumber}` : ''}`;
        const isUsernameExists = await this.userRepo.findOneBy({
            username: (0, typeorm_2.ILike)(username),
        });
        if (isUsernameExists) {
            return this.generateUsernameFromName(name, `${randomNumber}${Math.trunc(Math.random() * 100)}`);
        }
        return username;
    }
    async getBy({ email }) {
        return this.userRepo.findOneBy({ email });
    }
    async getExistByUsernameOrEmail({ username, email, }) {
        const user = await this.userRepo.findOne({
            where: [
                ...(username ? [{ username: (0, typeorm_2.ILike)(username) }] : []),
                ...(email ? [{ email }] : []),
            ],
            relations: { externalAccounts: true },
        });
        return user;
    }
    async create(createUser) {
        const name = createUser.username;
        const generatedUsername = await this.generateUsernameFromName(name);
        const user = this.userRepo.create({
            email: createUser.email,
            name,
            username: generatedUsername,
            hashedPassword: createUser.hashedPassword,
            ip: createUser.ip,
            status: 'not_verified',
        });
        return this.userRepo.save(user);
    }
    async validateAndGetUser(usernameOrEmail) {
        if (!usernameOrEmail) {
            throw new Error('Username or email is required to get user');
        }
        const user = await this.userRepo.findOne({
            where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
            relations: {
                externalAccounts: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (user.status === 'suspended') {
            throw new common_1.UnauthorizedException('User is suspended');
        }
        return user;
    }
    async getUsersForAdmin({ page = 1, limit = 20, search, role }) {
        console.log('getUsersForAdmin called with:', { page, limit, search, role });
        const skip = (page - 1) * limit;
        const queryBuilder = this.userRepo.createQueryBuilder('user');
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            queryBuilder.andWhere('(user.name ILIKE :search OR user.email ILIKE :search OR user.username ILIKE :search)', { search: searchTerm });
        }
        if (role) {
            queryBuilder.andWhere('user.role = :role', { role });
        }
        queryBuilder.orderBy('user.createdAt', 'DESC');
        const total = await queryBuilder.getCount();
        queryBuilder.skip(skip).take(limit);
        console.log('Query SQL:', queryBuilder.getSql());
        console.log('Query parameters:', queryBuilder.getParameters());
        try {
            const users = await queryBuilder.getMany();
            console.log('Database query result:', { usersCount: users.length, total });
            return {
                users,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
    async searchUsersForAdmin({ page = 1, limit = 20, search }) {
        return this.getUsersForAdmin({ page, limit, search });
    }
    async getUsersByRoleForAdmin({ page = 1, limit = 20, role }) {
        return this.getUsersForAdmin({ page, limit, role });
    }
    async getUserById(id) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async getUserByUsername(username) {
        const user = await this.userRepo.findOne({ where: { username } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateUserStatus(id, status) {
        const user = await this.getUserById(id);
        user.status = status;
        return this.userRepo.save(user);
    }
    async updateUserRole(id, roleUpdate) {
        const user = await this.getUserById(id);
        user.role = roleUpdate.role;
        user.isSuperAdmin = roleUpdate.role === 'super_admin';
        return this.userRepo.save(user);
    }
    async updateUserProfile(userId, updateData) {
        const user = await this.getUserById(userId);
        if (updateData.username && updateData.username !== user.username) {
            const existingUser = await this.userRepo.findOne({
                where: { username: (0, typeorm_2.ILike)(updateData.username) }
            });
            if (existingUser && existingUser.id !== userId) {
                throw new common_1.BadRequestException('Username is already taken');
            }
        }
        if (updateData.email && updateData.email !== user.email) {
            const existingUser = await this.userRepo.findOne({
                where: { email: updateData.email }
            });
            if (existingUser && existingUser.id !== userId) {
                throw new common_1.BadRequestException('Email is already taken');
            }
        }
        user.name = updateData.name;
        if (updateData.username !== undefined)
            user.username = updateData.username;
        user.email = updateData.email;
        if (updateData.imageUrl !== undefined)
            user.imageUrl = updateData.imageUrl;
        user.phone = updateData.phone;
        if (updateData.bio !== undefined)
            user.bio = updateData.bio;
        if (updateData.website !== undefined)
            user.website = updateData.website;
        user.businessName = updateData.businessName;
        user.businessABN = updateData.businessABN;
        user.description = updateData.description;
        user.location = updateData.location;
        if (updateData.idVerification !== undefined)
            user.idVerification = updateData.idVerification;
        const updatedUser = await this.userRepo.save(user);
        try {
            await this.sessionService.updateUserSession(userId, updatedUser);
        }
        catch (error) {
            console.error('Error updating session after user profile changes:', error);
        }
        return updatedUser;
    }
    async deleteUser(id) {
        const user = await this.getUserById(id);
        await this.userRepo.remove(user);
        return { message: 'User deleted successfully' };
    }
    async getDashboardStats() {
        const [totalUsers, activeUsers, suspendedUsers, unverifiedUsers] = await Promise.all([
            this.userRepo.count(),
            this.userRepo.count({ where: { status: 'active' } }),
            this.userRepo.count({ where: { status: 'suspended' } }),
            this.userRepo.count({ where: { status: 'not_verified' } }),
        ]);
        const [superAdmins, admins, regularUsers] = await Promise.all([
            this.userRepo.count({ where: { role: 'super_admin' } }),
            this.userRepo.count({ where: { role: 'admin' } }),
            this.userRepo.count({ where: { role: 'user' } }),
        ]);
        return {
            totalUsers,
            activeUsers,
            suspendedUsers,
            unverifiedUsers,
            superAdmins,
            admins,
            regularUsers,
        };
    }
    async verifyUser(userId) {
        const { affected } = await this.userRepo.update({ id: userId, status: (0, typeorm_2.Not)('active') }, { status: 'active' });
        if (affected === 0) {
            throw new common_1.BadRequestException('User already verified');
        }
        try {
            const updatedUser = await this.userRepo.findOneBy({ id: userId });
            if (updatedUser) {
                await this.sessionService.updateUserSession(userId, updatedUser);
            }
        }
        catch (error) {
            console.error('Error updating session after user verification:', error);
        }
    }
    async resetPassword(userId, hashedPassword) {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (!user.hashedPassword) {
            throw new common_1.BadRequestException('User does not have a password');
        }
        user.hashedPassword = hashedPassword;
        const updatedUser = await this.userRepo.save(user);
        try {
            await this.sessionService.updateUserSession(userId, updatedUser);
        }
        catch (error) {
            console.error('Error updating session after password reset:', error);
        }
        return updatedUser;
    }
    async verifyUserByEmail(email) {
        const user = await this.userRepo.findOneBy({ email });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (user.status === 'active') {
            throw new common_1.BadRequestException('User already verified');
        }
        user.status = 'active';
        await this.userRepo.save(user);
        try {
            await this.sessionService.updateUserSession(user.id, user);
        }
        catch (error) {
            console.error('Error updating session after user verification:', error);
        }
    }
    async migrateExistingUsers() {
        console.log('Starting migration of existing users...');
        const usersWithNullName = await this.userRepo.find({
            where: { name: null },
        });
        console.log(`Found ${usersWithNullName.length} users with null name`);
        for (const user of usersWithNullName) {
            try {
                user.name = user.username || 'User';
                const newUsername = await this.generateUsernameFromName(user.name);
                user.username = newUsername;
                await this.userRepo.save(user);
                console.log(`Migrated user: ${user.email} -> name: ${user.name}, username: ${user.username}`);
            }
            catch (error) {
                console.error(`Failed to migrate user ${user.email}:`, error);
            }
        }
        console.log('Migration completed');
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(account_entity_1.User)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => session_service_1.SessionService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        session_service_1.SessionService])
], UsersService);
//# sourceMappingURL=users.service.js.map