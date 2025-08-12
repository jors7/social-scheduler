# Admin Dashboard Setup Guide

## Overview
The admin dashboard provides comprehensive user management, analytics, and system administration capabilities for Social Scheduler.

## Features
- 👥 **User Management**: View, search, and manage all users
- 📊 **Analytics Dashboard**: System-wide metrics and statistics  
- 🔒 **Role-Based Access**: User, Admin, and Super Admin roles
- 📝 **Audit Logging**: Track all administrative actions
- ⚙️ **System Settings**: Configure platform limits and behavior

## Setup Instructions

### 1. Apply Database Migration
Run the following SQL in your Supabase SQL Editor:

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Copy and paste the contents of:
/supabase/migrations/20250111_add_admin_roles.sql
```

### 2. Create Your First Admin
After applying the migration, make yourself a super admin:

```sql
-- Replace with your actual email address
UPDATE user_subscriptions 
SET role = 'super_admin' 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);
```

### 3. Access the Admin Dashboard
Navigate to `/admin` in your application. You must be logged in as an admin to access this area.

## Admin Roles

### User (Default)
- Standard user access
- Can only view/edit their own data
- No admin privileges

### Admin
- Access to admin dashboard
- Can view all users and their data
- Can view system analytics
- Can suspend/activate user accounts
- Cannot change user roles

### Super Admin
- All Admin privileges plus:
- Can promote/demote users to admin
- Can access all system settings
- Can perform database maintenance

## Admin Pages

### `/admin` - Overview Dashboard
- System-wide statistics
- Quick metrics (users, revenue, posts)
- Quick action links

### `/admin/users` - User Management
- Search and filter users
- View user details
- Manage subscriptions
- Suspend/activate accounts

### `/admin/users/[id]` - User Details
- Detailed user information
- Subscription management
- Usage statistics
- Account actions

### `/admin/analytics` - Analytics Dashboard
- Revenue metrics
- User growth statistics
- Content creation metrics
- Conversion rates

### `/admin/audit` - Audit Log
- Track all admin actions
- Filter by action type
- View action details
- Security monitoring

### `/admin/settings` - System Settings
- Security configuration
- System limits
- Notification preferences
- Database maintenance

## Security Considerations

### Access Control
- Database-level RLS policies enforce permissions
- API middleware validates admin status
- UI components check roles before rendering

### Audit Trail
All admin actions are logged including:
- Who performed the action
- When it was performed
- What was changed
- Target user/resource

### Best Practices
1. Limit super admin accounts
2. Regularly review audit logs
3. Use strong passwords for admin accounts
4. Monitor suspicious activity
5. Rotate admin access periodically

## API Endpoints

### User Management
- `GET /api/admin/users` - List all users
- `GET /api/admin/users?stats=true` - Get system statistics
- `GET /api/admin/users/[id]` - Get user details
- `PATCH /api/admin/users/[id]` - Update user (role, status)

### Actions
- `update_role` - Change user role (super admin only)
- `suspend` - Suspend user account
- `activate` - Activate user account

## Troubleshooting

### Can't Access Admin Dashboard
1. Verify you're logged in
2. Check your role in the database:
```sql
SELECT role FROM user_subscriptions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email');
```

### API Returns 403 Forbidden
- Ensure your account has admin or super_admin role
- Check that the migration was applied successfully

### Users Not Loading
- Verify Supabase service role key is configured
- Check browser console for errors
- Ensure RLS policies are properly set

## Future Enhancements
- [ ] Email notifications for admin actions
- [ ] Bulk user operations
- [ ] Advanced analytics with charts
- [ ] Export user data to CSV
- [ ] Automated backups
- [ ] Custom admin permissions
- [ ] Real-time dashboard updates

## Support
For issues or questions about the admin dashboard, please check the logs or contact the development team.