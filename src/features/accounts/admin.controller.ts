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
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { ActiveUserGuard } from '../../middleware/ActiveUserGuard';
import { AdminGuard } from '../../middleware/AdminGuard';
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
@UseGuards(LoggedInGuard, ActiveUserGuard, AdminGuard)
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  @Serialize(UserDto)
  async getUsers(@Query() query: AdminUsersQuery, @Res() res: Response) {
    const { page = 1, limit = 20, search, role } = query;
    const data = await this.usersService.getUsersForAdmin({ page, limit, search, role });
    console.log('data', data);
    
    // Set cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return res.json(data);
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

  @Get('debug/current-user')
  async getCurrentUserDebug(@Req() req: Request) {
    return {
      message: 'Current user debug info',
      user: req.user,
      isAuthenticated: req.isAuthenticated(),
      session: req.session,
      headers: {
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
      }
    };
  }

  @Get('debug/users-raw')
  async getUsersRaw(@Query() query: AdminUsersQuery) {
    const { page = 1, limit = 20, search, role } = query;
    
    try {
      const result = await this.usersService.getUsersForAdmin({ page, limit, search, role });
      return {
        message: 'Raw users data (no serialization)',
        query: { page, limit, search, role },
        result,
        usersCount: result.users.length,
        total: result.total
      };
    } catch (error) {
      return {
        message: 'Error fetching users',
        error: error.message,
        stack: error.stack
      };
    }
  }
} 