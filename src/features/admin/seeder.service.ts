import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRoleEnum } from '../accounts/entities/account.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async seedSuperAdmins() {
    try {
      // Get super admin emails from environment variable
      const superAdminEmails = this.configService.get<string>('SUPER_ADMIN_EMAILS');
      
      if (!superAdminEmails) {
        this.logger.warn('SUPER_ADMIN_EMAILS not configured, skipping super admin seeding');
        return;
      }

      const emails = superAdminEmails.split(',').map(email => email.trim());
      
      for (const email of emails) {
        await this.createSuperAdminIfNotExists(email);
      }

      this.logger.log('Super admin seeding completed');
    } catch (error) {
      this.logger.error('Error seeding super admins:', error);
    }
  }

  private async createSuperAdminIfNotExists(email: string) {
    const existingUser = await this.userRepo.findOne({ where: { email } });

    if (existingUser) {
      // Update existing user to super admin if not already
      if (existingUser.role !== 'super_admin') {
        existingUser.role = 'super_admin';
        existingUser.isSuperAdmin = true;
        await this.userRepo.save(existingUser);
        this.logger.log(`Updated user ${email} to super admin`);
      } else {
        this.logger.log(`User ${email} is already a super admin`);
      }
    } else {
      // Create new super admin user with default password
      const defaultPassword = this.configService.get<string>('SUPER_ADMIN_DEFAULT_PASSWORD') || 'Admin@123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const superAdmin = this.userRepo.create({
        email,
        name: 'Super Admin',
        username: `admin_${Date.now()}`,
        role: 'super_admin',
        isSuperAdmin: true,
        status: 'active',
        hashedPassword,
      });

      await this.userRepo.save(superAdmin);
      this.logger.log(`Created super admin user: ${email} with default password: ${defaultPassword}`);
    }
  }

  async assignRoleByEmail(email: string, role: UserRoleEnum) {
    const user = await this.userRepo.findOne({ where: { email } });
    
    if (!user) {
      this.logger.warn(`User with email ${email} not found`);
      return null;
    }

    user.role = role;
    user.isSuperAdmin = role === 'super_admin';
    
    const updatedUser = await this.userRepo.save(user);
    this.logger.log(`Assigned role ${role} to user ${email}`);
    
    return updatedUser;
  }

  async setPasswordForUser(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    
    if (!user) {
      this.logger.warn(`User with email ${email} not found`);
      return null;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.hashedPassword = hashedPassword;
    
    const updatedUser = await this.userRepo.save(user);
    this.logger.log(`Password set for user ${email}`);
    
    return updatedUser;
  }

  async createSuperAdminWithPassword(email: string, password: string) {
    const existingUser = await this.userRepo.findOne({ where: { email } });

    if (existingUser) {
      this.logger.warn(`User with email ${email} already exists`);
      return existingUser;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const superAdmin = this.userRepo.create({
      email,
      name: 'Super Admin',
      username: `admin_${Date.now()}`,
      role: 'super_admin',
      isSuperAdmin: true,
      status: 'active',
      hashedPassword,
    });

    const savedUser = await this.userRepo.save(superAdmin);
    this.logger.log(`Created super admin user: ${email}`);
    
    return savedUser;
  }

  async getSuperAdmins() {
    return await this.userRepo.find({ 
      where: { role: 'super_admin' },
      select: ['id', 'email', 'name', 'username', 'createdAt']
    });
  }

  async resetSuperAdminPassword(email: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { email, role: 'super_admin' } });
    
    if (!user) {
      this.logger.warn(`Super admin with email ${email} not found`);
      return null;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.hashedPassword = hashedPassword;
    
    const updatedUser = await this.userRepo.save(user);
    this.logger.log(`Password reset for super admin: ${email}`);
    
    return updatedUser;
  }
} 