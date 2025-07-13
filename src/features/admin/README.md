# Super Admin System

This module provides comprehensive super admin functionality for managing users and system operations.

## Features

- **Role-based Access Control**: Super admin, admin, and user roles
- **User Management**: View, update, delete, and search users
- **System Statistics**: Dashboard with user analytics
- **Email-based Role Assignment**: Automatic role assignment based on email addresses
- **Seeder System**: Create initial super admin users with passwords
- **Password Management**: Set, reset, and manage user passwords

## Database Schema

### User Entity Updates

The User entity has been extended with role-related fields:

```typescript
// New fields added to User entity
@Column({ type: 'enum', enum: ['user', 'admin', 'super_admin'], default: 'user' })
role: UserRoleEnum;

@Column({ type: 'boolean', default: false })
isSuperAdmin: boolean;

@Column({ type: 'jsonb', nullable: true })
permissions: Record<string, any>;
```

## API Endpoints

### Super Admin Endpoints (Protected by SuperAdminGuard)

#### Dashboard & Analytics
- `GET /api/v1/admin/dashboard` - System statistics
- `GET /api/v1/admin/analytics/users` - User analytics

#### User Management
- `GET /api/v1/admin/users` - List all users (paginated)
- `GET /api/v1/admin/users/:id` - Get specific user
- `PATCH /api/v1/admin/users/:id/status` - Update user status
- `PATCH /api/v1/admin/users/:id/role` - Update user role
- `DELETE /api/v1/admin/users/:id` - Delete user

#### Search & Filter
- `GET /api/v1/admin/users/search?q=query` - Search users
- `GET /api/v1/admin/users/role/:role` - Get users by role

#### Seeder & Role Assignment
- `POST /api/v1/admin/seed-super-admin` - Seed super admin users
- `POST /api/v1/admin/assign-role` - Assign role by email

#### Password Management
- `POST /api/v1/admin/set-password` - Set password for any user
- `POST /api/v1/admin/create-super-admin` - Create super admin with password
- `POST /api/v1/admin/reset-super-admin-password` - Reset super admin password

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Comma-separated list of super admin email addresses
SUPER_ADMIN_EMAILS=admin@example.com,super@example.com

# Default password for seeded super admin users (optional)
SUPER_ADMIN_DEFAULT_PASSWORD=Admin@123
```

## Usage

### 1. Setup Super Admin Users

#### Option A: Automatic Seeding (with default password)
Set the `SUPER_ADMIN_EMAILS` environment variable and call the seeder endpoint:

```bash
curl -X POST http://localhost:3001/api/v1/admin/seed-super-admin
```

This will create super admin users with the default password (`Admin@123` or your custom `SUPER_ADMIN_DEFAULT_PASSWORD`).

#### Option B: Create Super Admin with Custom Password
```bash
curl -X POST http://localhost:3001/api/v1/admin/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-secure-password"
  }'
```

### 2. Set Password for Existing Users
```bash
curl -X POST http://localhost:3001/api/v1/admin/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "new-password"
  }'
```

### 3. Reset Super Admin Password
```bash
curl -X POST http://localhost:3001/api/v1/admin/reset-super-admin-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "newPassword": "new-secure-password"
  }'
```

### 4. Access Super Admin Dashboard

Login with a super admin account and access:

```bash
curl -X GET http://localhost:3001/api/v1/admin/dashboard
```

### 5. Manage Users

```bash
# Get all users
curl -X GET http://localhost:3001/api/v1/admin/users

# Update user status
curl -X PATCH http://localhost:3001/api/v1/admin/users/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended"}'

# Update user role
curl -X PATCH http://localhost:3001/api/v1/admin/users/{id}/role \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

## Authentication

### Login as Super Admin

Super admin users can login using the regular authentication endpoints:

```bash
# Login with email and password
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "admin@example.com",
    "password": "your-password"
  }'
```

### Default Credentials

When using the seeder, super admin users are created with:
- **Email**: As specified in `SUPER_ADMIN_EMAILS`
- **Password**: `Admin@123` (or your custom `SUPER_ADMIN_DEFAULT_PASSWORD`)
- **Status**: `active`
- **Role**: `super_admin`

## Guards

### SuperAdminGuard

Protects routes that require super admin access:

```typescript
@UseGuards(SuperAdminGuard)
@Controller('admin')
export class AdminController {
  // Only super admins can access these endpoints
}
```

## DTOs

### AdminUserDto
Serializes user data for admin responses with role information.

### UpdateUserStatusDto
```typescript
{
  status: 'active' | 'suspended' | 'not_verified'
}
```

### UpdateUserRoleDto
```typescript
{
  role: 'user' | 'admin' | 'super_admin'
}
```

## Services

### AdminService
- User management operations
- System statistics
- Search and filtering

### SeederService
- Create super admin users from environment variables
- Assign roles by email
- Manage passwords for users
- Create super admins with custom passwords
- Reset super admin passwords

## Security Features

- **Role Validation**: Prevents modification of super admin accounts
- **Email-based Access**: Automatic role assignment based on email
- **Guarded Endpoints**: All admin endpoints protected by SuperAdminGuard
- **Backward Compatibility**: Existing users maintain 'user' role by default
- **Password Security**: All passwords are hashed using bcrypt
- **Default Password**: Configurable default password for seeded users

## Migration Notes

- Existing users will have `role: 'user'` and `isSuperAdmin: false` by default
- No breaking changes to existing authentication flow
- New fields are optional and have sensible defaults
- Super admin users created by seeder have passwords and can login immediately 