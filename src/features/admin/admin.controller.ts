import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SeederService } from './seeder.service';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { Serialize } from '../../transformers/serialize.interceptor';
import { AdminUserDto, UserListDto, SimpleUserListDto, UpdateUserStatusDto, UpdateUserRoleDto, UserSearchDto } from './dto/admin-user.dto';
import { AdminActionLoggerInterceptor } from './interceptors/admin-action-logger.interceptor';
import { LogAdminAction } from './decorators/log-admin-action.decorator';

@Controller('admin')
@UseGuards(SuperAdminGuard)
@UseInterceptors(AdminActionLoggerInterceptor)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly seederService: SeederService,
  ) {}

  // Dashboard - Get system statistics
  @Get('dashboard')
  @LogAdminAction({ action: 'Viewed admin dashboard' })
  async getDashboard() {
    return await this.adminService.getSystemStats();
  }

  // Get all users with pagination
  @Get('users')
  // @Serialize(SimpleUserListDto) // Temporarily disabled for debugging
  @LogAdminAction({ action: 'Viewed all users list' })
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.adminService.getAllUsers(page, limit);
    console.log('Controller result:', result);
    return result;
  }

  // Get specific user
  @Get('users/:id')
  @Serialize(AdminUserDto)
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return await this.adminService.getUserById(id);
  }

  // Update user status
  @Patch('users/:id/status')
  @Serialize(AdminUserDto)
  @LogAdminAction({ 
    action: 'Updated user status',
    includeRequest: true,
    includeUser: true 
  })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ) {
    return await this.adminService.updateUserStatus(id, updateStatusDto.status);
  }

  // Update user role
  @Patch('users/:id/role')
  @Serialize(AdminUserDto)
  @LogAdminAction({ 
    action: 'Updated user role',
    includeRequest: true,
    includeUser: true 
  })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
  ) {
    return await this.adminService.updateUserRole(id, updateRoleDto.role);
  }

  // Delete user
  @Delete('users/:id')
  @LogAdminAction({ 
    action: 'Deleted user',
    includeRequest: true,
    includeUser: true,
    level: 'warning'
  })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return await this.adminService.deleteUser(id);
  }

  // Search users
  @Get('users/search')
  @Serialize(SimpleUserListDto)
  async searchUsers(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.adminService.searchUsers(query, page, limit);
  }

  // Get users by role
  @Get('users/role/:role')
  @Serialize(SimpleUserListDto)
  async getUsersByRole(
    @Param('role') role: 'user' | 'admin' | 'super_admin',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.adminService.getUsersByRole(role, page, limit);
  }

  // Analytics endpoints
  @Get('analytics/users')
  async getUserAnalytics() {
    const stats = await this.adminService.getSystemStats();
    
    // Add more analytics data here as needed
    return {
      ...stats,
      // Add date-based analytics, growth rates, etc.
    };
  }

  // Seeder endpoint
  @Post('seed-super-admin')
  async seedSuperAdmin() {
    await this.seederService.seedSuperAdmins();
    const superAdmins = await this.seederService.getSuperAdmins();
    return {
      message: 'Super admin seeding completed',
      superAdmins,
    };
  }

  // Assign role by email
  @Post('assign-role')
  async assignRoleByEmail(
    @Body() body: { email: string; role: 'user' | 'admin' | 'super_admin' },
  ) {
    const user = await this.seederService.assignRoleByEmail(body.email, body.role);
    return {
      message: `Role ${body.role} assigned to ${body.email}`,
      user,
    };
  }

  // Password management endpoints
  @Post('set-password')
  async setPasswordForUser(
    @Body() body: { email: string; password: string },
  ) {
    const user = await this.seederService.setPasswordForUser(body.email, body.password);
    return {
      message: `Password set for user ${body.email}`,
      user: user ? { id: user.id, email: user.email } : null,
    };
  }

  @Post('create-super-admin')
  async createSuperAdminWithPassword(
    @Body() body: { email: string; password: string },
  ) {
    const user = await this.seederService.createSuperAdminWithPassword(body.email, body.password);
    return {
      message: `Super admin created: ${body.email}`,
      user: user ? { id: user.id, email: user.email } : null,
    };
  }

  @Post('reset-super-admin-password')
  async resetSuperAdminPassword(
    @Body() body: { email: string; newPassword: string },
  ) {
    const user = await this.seederService.resetSuperAdminPassword(body.email, body.newPassword);
    return {
      message: `Password reset for super admin: ${body.email}`,
      user: user ? { id: user.id, email: user.email } : null,
    };
  }
} 