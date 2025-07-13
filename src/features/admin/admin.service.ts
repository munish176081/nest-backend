import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatusEnum, UserRoleEnum } from '../accounts/entities/account.entity';
import { UsersService } from '../accounts/users.service';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityTypeEnum } from './entities/activity-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // Get all users with pagination
  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await this.userRepo.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'name', 'username', 'status', 'role', 'createdAt', 'updatedAt'],
    });

    // Debug: Log the raw data
    console.log('Raw users from database:', users);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get user by ID
  async getUserById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['externalAccounts'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Update user status
  async updateUserStatus(id: string, status: UserStatusEnum) {
    const user = await this.getUserById(id);
    
    if (user.role === 'super_admin') {
      throw new BadRequestException('Cannot modify super admin status');
    }

    const oldStatus = user.status;
    user.status = status;
    const updatedUser = await this.userRepo.save(user);

    // Log the status change
    await this.activityLogService.createActivityLog({
      type: ActivityTypeEnum.USER_STATUS_CHANGED,
      action: `User status changed from ${oldStatus} to ${status}`,
      description: `User ${user.email} status updated`,
      targetId: user.id,
      targetEmail: user.email,
      targetType: 'user',
      metadata: {
        oldStatus,
        newStatus: status,
        userId: user.id,
      },
    });

    return updatedUser;
  }

  // Update user role
  async updateUserRole(id: string, role: UserRoleEnum) {
    const user = await this.getUserById(id);
    
    // Prevent changing super admin role
    if (user.role === 'super_admin') {
      throw new BadRequestException('Cannot modify super admin role');
    }

    const oldRole = user.role;
    user.role = role;
    user.isSuperAdmin = role === 'super_admin';
    
    const updatedUser = await this.userRepo.save(user);

    // Log the role change
    await this.activityLogService.createActivityLog({
      type: ActivityTypeEnum.USER_ROLE_CHANGED,
      action: `User role changed from ${oldRole} to ${role}`,
      description: `User ${user.email} role updated`,
      targetId: user.id,
      targetEmail: user.email,
      targetType: 'user',
      metadata: {
        oldRole,
        newRole: role,
        userId: user.id,
      },
    });

    return updatedUser;
  }

  // Delete user
  async deleteUser(id: string) {
    const user = await this.getUserById(id);
    
    if (user.role === 'super_admin') {
      throw new BadRequestException('Cannot delete super admin');
    }

    // Log the user deletion
    await this.activityLogService.createActivityLog({
      type: ActivityTypeEnum.USER_DELETED,
      action: 'User deleted from system',
      description: `User ${user.email} was deleted`,
      targetId: user.id,
      targetEmail: user.email,
      targetType: 'user',
      metadata: {
        deletedUser: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
    });

    await this.userRepo.remove(user);
    return { message: 'User deleted successfully' };
  }

  // Get system statistics
  async getSystemStats() {
    const totalUsers = await this.userRepo.count();
    const activeUsers = await this.userRepo.count({ where: { status: 'active' } });
    const suspendedUsers = await this.userRepo.count({ where: { status: 'suspended' } });
    const unverifiedUsers = await this.userRepo.count({ where: { status: 'not_verified' } });
    const superAdmins = await this.userRepo.count({ where: { role: 'super_admin' } });
    const admins = await this.userRepo.count({ where: { role: 'admin' } });

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      unverifiedUsers,
      superAdmins,
      admins,
      regularUsers: totalUsers - superAdmins - admins,
    };
  }

  // Get users by role
  async getUsersByRole(role: UserRoleEnum, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await this.userRepo.findAndCount({
      where: { role },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['externalAccounts'],
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Search users
  async searchUsers(query: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await this.userRepo.findAndCount({
      where: [
        { email: { $ilike: `%${query}%` } as any },
        { name: { $ilike: `%${query}%` } as any },
        { username: { $ilike: `%${query}%` } as any },
      ],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['externalAccounts'],
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
} 