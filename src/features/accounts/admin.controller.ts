import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Patch,
  Body,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { LocalAuthGuard } from '../authentication/guards/local-auth.guard';
import { ActiveUserGuard } from '../../middleware/ActiveUserGuard';
import { Serialize } from '../../transformers/serialize.interceptor';
import { UserDto } from './dto/user.dto';

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

@Controller('admin')
@UseGuards(LocalAuthGuard, ActiveUserGuard)
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  @Serialize(UserDto)
  async getUsers(@Query() query: AdminUsersQuery) {
    const { page = 1, limit = 20, search, role } = query;
    return this.usersService.getUsersForAdmin({ page, limit, search, role });
  }

  @Get('users/search')
  @Serialize(UserDto)
  async searchUsers(@Query('q') search: string, @Query() query: AdminUsersQuery) {
    const { page = 1, limit = 20 } = query;
    return this.usersService.searchUsersForAdmin({ page, limit, search });
  }

  @Get('users/role/:role')
  @Serialize(UserDto)
  async getUsersByRole(
    @Param('role') role: 'user' | 'admin' | 'super_admin',
    @Query() query: AdminUsersQuery,
  ) {
    const { page = 1, limit = 20 } = query;
    return this.usersService.getUsersByRoleForAdmin({ page, limit, role });
  }

  @Get('users/:id')
  @Serialize(UserDto)
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch('users/:id/status')
  @Serialize(UserDto)
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusUpdate: AdminStatusUpdateDto,
  ) {
    return this.usersService.updateUserStatus(id, statusUpdate.status);
  }

  @Patch('users/:id/role')
  @Serialize(UserDto)
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() roleUpdate: AdminRoleUpdateDto,
  ) {
    return this.usersService.updateUserRole(id, roleUpdate);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deleteUser(id);
  }

  @Get('dashboard')
  async getDashboardStats() {
    return this.usersService.getDashboardStats();
  }
} 