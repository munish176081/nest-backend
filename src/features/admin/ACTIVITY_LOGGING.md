# Activity Logging System

This module provides comprehensive activity logging and audit trail functionality for the admin dashboard.

## Features

- **Comprehensive Activity Tracking**: Log all admin actions, user activities, and system events
- **Real-time Activity Monitoring**: Track recent activities and system statistics
- **Advanced Filtering**: Filter activities by type, user, date range, and more
- **Audit Trail**: Complete history of all system changes and admin actions
- **Automatic Logging**: Decorator-based automatic logging for admin actions
- **Performance Optimized**: Efficient querying and pagination for large datasets
- **Data Retention**: Automatic cleanup of old logs (90 days)

## Database Schema

### ActivityLog Entity

```typescript
@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ActivityTypeEnum })
  type: ActivityTypeEnum;

  @Column({ type: 'enum', enum: ActivityLevelEnum, default: ActivityLevelEnum.INFO })
  level: ActivityLevelEnum;

  @Column()
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  // Actor (who performed the action)
  @Column({ nullable: true })
  actorId: string;

  @Column({ nullable: true })
  actorEmail: string;

  @Column({ nullable: true })
  actorRole: string;

  // Target (who the action was performed on)
  @Column({ nullable: true })
  targetId: string;

  @Column({ nullable: true })
  targetEmail: string;

  @Column({ nullable: true })
  targetType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Activity Types

### User Activities
- `USER_CREATED` - New user registration
- `USER_UPDATED` - User profile updates
- `USER_DELETED` - User account deletion
- `USER_STATUS_CHANGED` - User status modifications
- `USER_ROLE_CHANGED` - User role changes
- `USER_LOGIN` - User login events
- `USER_LOGOUT` - User logout events

### Admin Activities
- `ADMIN_ACTION` - General admin actions
- `PASSWORD_CHANGED` - Password modifications
- `PASSWORD_RESET` - Password reset events
- `ACCOUNT_SUSPENDED` - Account suspension
- `ACCOUNT_ACTIVATED` - Account activation

### System Activities
- `SYSTEM_EVENT` - System-level events
- `LISTING_CREATED` - New listing creation
- `LISTING_UPDATED` - Listing modifications
- `LISTING_DELETED` - Listing deletion
- `MEETING_CREATED` - Meeting creation
- `MEETING_UPDATED` - Meeting modifications
- `MEETING_CANCELLED` - Meeting cancellations

## API Endpoints

### Activity Logs Management

#### Get All Activity Logs
```http
GET /api/v1/admin/activity-logs?page=1&limit=20&type=admin_action&level=info
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `type` - Filter by activity type
- `level` - Filter by activity level (info, warning, error, critical)
- `actorId` - Filter by actor user ID
- `targetId` - Filter by target user ID
- `resourceType` - Filter by resource type
- `startDate` - Start date for date range filter
- `endDate` - End date for date range filter
- `search` - Search in action, description, or emails

#### Get Recent Activities
```http
GET /api/v1/admin/activity-logs/recent?limit=50
```

Returns activities from the last 24 hours.

#### Get Activity Statistics
```http
GET /api/v1/admin/activity-logs/stats
```

Returns comprehensive activity statistics including:
- Total activities count
- Activities today, this week, this month
- Top activity types
- Top actors (users who performed most actions)

#### Get User Activities
```http
GET /api/v1/admin/activity-logs/user/:userId?page=1&limit=20
```

Returns all activities related to a specific user (as actor or target).

#### Get Activities by Type
```http
GET /api/v1/admin/activity-logs/type/:type?page=1&limit=20
```

Returns all activities of a specific type.

#### Clean Old Logs
```http
GET /api/v1/admin/activity-logs/clean/old-logs
```

Removes activity logs older than 90 days.

## Automatic Logging

### Decorator-based Logging

Use the `@LogAdminAction` decorator to automatically log admin actions:

```typescript
@LogAdminAction({ 
  action: 'Updated user status',
  includeRequest: true,
  includeUser: true 
})
async updateUserStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
  // Method implementation
}
```

**Decorator Options:**
- `action` - Description of the action performed
- `description` - Optional detailed description
- `level` - Activity level (info, warning, error, critical)
- `includeRequest` - Include request body, params, and query
- `includeResponse` - Include response data
- `includeUser` - Include user information

### Manual Logging

Use the `ActivityLogService` to manually log activities:

```typescript
// Log admin action
await this.activityLogService.logAdminAction(
  adminUser,
  'Updated user permissions',
  targetUser,
  { permissions: ['read', 'write'] },
  request
);

// Log user action
await this.activityLogService.logUserAction(
  user,
  'Updated profile',
  ActivityTypeEnum.USER_UPDATED,
  { updatedFields: ['name', 'email'] },
  request
);
```

## Integration with Existing Admin System

### Enhanced Admin Controller

The existing admin controller has been enhanced with automatic logging:

- **Dashboard Access**: Logged when admin views dashboard
- **User Management**: All user operations are automatically logged
- **Status Changes**: Detailed logging of user status modifications
- **Role Changes**: Complete audit trail of role assignments
- **User Deletion**: Critical logging of user deletions

### Enhanced Admin Service

The admin service now includes activity logging for:

- User status updates
- User role changes
- User deletions
- System statistics access

## Frontend Integration

### Activity Dashboard Components

The frontend can integrate with these endpoints to display:

1. **Recent Activity Feed**
   - Real-time activity updates
   - Filterable activity stream
   - User-friendly activity descriptions

2. **Activity Statistics**
   - Activity charts and graphs
   - Top performers
   - System health metrics

3. **User Activity Timeline**
   - Individual user activity history
   - Detailed user audit trail
   - Activity patterns analysis

4. **Admin Audit Trail**
   - Complete admin action history
   - Request/response logging
   - Security monitoring

## Security Features

- **IP Address Tracking**: Log IP addresses for security monitoring
- **User Agent Logging**: Track browser/client information
- **Metadata Storage**: Store additional context in JSON format
- **Actor/Target Tracking**: Complete audit trail of who did what to whom
- **Level-based Logging**: Different severity levels for different actions
- **Data Retention**: Automatic cleanup to prevent database bloat

## Performance Considerations

- **Pagination**: All endpoints support pagination
- **Efficient Queries**: Optimized database queries with proper indexing
- **Selective Logging**: Only log important actions to prevent noise
- **Background Processing**: Non-blocking logging operations
- **Data Cleanup**: Automatic removal of old logs

## Monitoring and Alerts

### High-Priority Activities
- User deletions
- Role changes to admin/super_admin
- Account suspensions
- Password resets
- System errors

### Alert Conditions
- Multiple failed login attempts
- Unusual admin activity patterns
- Critical system events
- Data integrity issues

## Usage Examples

### Basic Activity Logging
```typescript
// In a service
await this.activityLogService.createActivityLog({
  type: ActivityTypeEnum.ADMIN_ACTION,
  action: 'Viewed user details',
  description: 'Admin viewed user profile',
  actorId: adminUser.id,
  actorEmail: adminUser.email,
  actorRole: adminUser.role,
  targetId: targetUser.id,
  targetEmail: targetUser.email,
  targetType: 'user',
  metadata: {
    viewedFields: ['profile', 'activity'],
    sessionId: request.sessionID,
  },
}, request);
```

### Decorator Usage
```typescript
@Controller('admin')
@UseGuards(SuperAdminGuard)
@UseInterceptors(AdminActionLoggerInterceptor)
export class AdminController {
  
  @Get('users')
  @LogAdminAction({ action: 'Viewed users list' })
  async getUsers() {
    // Automatically logged
  }

  @Patch('users/:id/status')
  @LogAdminAction({ 
    action: 'Updated user status',
    includeRequest: true,
    level: 'warning'
  })
  async updateUserStatus() {
    // Automatically logged with request details
  }
}
```

## Migration Notes

- Existing admin functionality remains unchanged
- New activity logging is additive and non-breaking
- All existing endpoints continue to work as before
- New endpoints are protected by the same SuperAdminGuard
- Database migration will create the activity_logs table
- No changes required to existing frontend code

## Future Enhancements

- **Real-time Notifications**: WebSocket-based activity notifications
- **Advanced Analytics**: Machine learning-based activity pattern analysis
- **Export Functionality**: CSV/PDF export of activity logs
- **Integration with External Tools**: SIEM integration for enterprise security
- **Custom Activity Types**: Extensible activity type system
- **Activity Templates**: Predefined activity logging templates 