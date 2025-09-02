# User Management & Role-Based Access Control (RBAC)

## Overview

The MDV e-commerce platform implements a comprehensive Role-Based Access Control (RBAC) system with four distinct user roles, each with specific permissions and restrictions.

## User Roles Hierarchy

### 1. Admin (Highest Privileges)
- **Full system access** including all permissions
- **User management**: Can create, edit, delete, and manage all user types including other admins and supervisors
- **Password management**: Can reset passwords for all users
- **System administration**: Access to all system settings and configurations

### 2. Supervisor (Limited Administrative Access)
- **Most administrative permissions** except user management restrictions
- **User management restrictions**:
  - ❌ **Cannot create** admin or supervisor accounts
  - ❌ **Cannot edit** admin or supervisor accounts  
  - ❌ **Cannot delete** admin or supervisor accounts
  - ❌ **Cannot reset passwords** for admin or supervisor accounts
  - ✅ **Can manage** operations and logistics users
- **All other permissions**: Products, orders, inventory, reports, etc.

### 3. Operations (Operational Focus)
- **Product management**: Create, edit, delete products and categories
- **Inventory management**: View and adjust inventory levels
- **Order fulfillment**: Manage order processing and fulfillment
- **Limited reporting**: View operational reports

### 4. Logistics (Shipping Focus)
- **Order shipping**: View and update shipping information
- **Inventory viewing**: Read-only access to inventory levels
- **Limited reporting**: View logistics-related reports
- **Product viewing**: Read-only access to product information

## User Management Features

### Password Reset Functionality
- **Default Password**: When an admin resets a user's password, it's set to `"password123"`
- **Forced Change**: Users must change their password on next login
- **Audit Logging**: All password reset actions are logged for security
- **Self-Reset Prevention**: Users cannot reset their own passwords through admin interface

### User Deletion (Soft Delete)
- **Soft Delete**: Users are deactivated rather than permanently deleted
- **Business Rules**: 
  - Cannot delete users with active orders (unless forced)
  - Cannot delete users with recent orders (within 30 days, unless forced)
  - Cannot delete your own account
- **Force Option**: Admins can override business rules with `force=true`
- **Audit Trail**: All deletion actions are logged

### Role-Based UI Restrictions

#### For Supervisor Users:
- **Visual Indicators**: "(Limited Access - Cannot manage Admin/Supervisor accounts)" shown in header
- **Hidden Actions**: Edit, delete, and password reset buttons hidden for admin/supervisor accounts
- **Graceful Degradation**: "No actions available" message shown when no actions are permitted

#### For Admin Users:
- **Full Access**: All user management actions available
- **No Restrictions**: Can manage all user types including other admins

## API Endpoints & Permissions

### User Management Endpoints

| Endpoint | Admin | Supervisor | Operations | Logistics |
|----------|-------|------------|------------|-----------|
| `GET /api/admin/users` | ✅ | ✅ | ❌ | ❌ |
| `POST /api/admin/users` | ✅ | ✅* | ❌ | ❌ |
| `PUT /api/admin/users/{id}` | ✅ | ✅* | ❌ | ❌ |
| `DELETE /api/admin/users/{id}` | ✅ | ✅* | ❌ | ❌ |
| `POST /api/admin/users/{id}/reset-password` | ✅ | ✅* | ❌ | ❌ |

*\* Supervisors have restrictions on admin/supervisor accounts*

### Permission Checks

```python
# Backend permission validation
if actor_role == "supervisor" and target_user.role in [Role.admin, Role.supervisor]:
    raise HTTPException(status_code=403, detail="Supervisors cannot manage admin/supervisor accounts")
```

```typescript
// Frontend permission checks
const canEditUser = (user: User) => {
  if (!canManageUsers) return false
  if (isCurrentUserSupervisor && ['admin', 'supervisor'].includes(user.role)) return false
  return true
}
```

## Security Features

### Audit Logging
All user management actions are logged with:
- **Actor ID**: Who performed the action
- **Action Type**: create, update, delete, password_reset, etc.
- **Target User**: Which user was affected
- **Before/After State**: What changed
- **Timestamp**: When the action occurred
- **Force Flag**: Whether business rules were overridden

### Business Rule Validation
- **Active Orders Check**: Prevents deletion of users with pending/paid orders
- **Recent Activity Check**: Prevents deletion of users with recent orders (30 days)
- **Self-Action Prevention**: Users cannot delete or reset their own accounts
- **Role Hierarchy**: Supervisors cannot elevate privileges or manage higher roles

## Error Handling

### Common Error Responses

| Status Code | Scenario | Message |
|-------------|----------|---------|
| 400 | Self-action attempt | "Cannot delete your own account" |
| 403 | Supervisor restriction | "Supervisors cannot manage admin/supervisor accounts" |
| 409 | Business rule violation | "User has X active order(s). Use force=true to delete anyway." |
| 404 | User not found | "User not found" |

### Frontend Error Handling
- **Graceful Degradation**: UI adapts based on user permissions
- **Clear Messaging**: Specific error messages for different scenarios
- **Force Options**: Confirmation dialogs for overriding business rules
- **Rollback Support**: Failed operations don't leave UI in inconsistent state

## Implementation Notes

### Database Schema
```sql
-- Added to users table
force_password_change BOOLEAN DEFAULT FALSE
```

### New RBAC Permissions
```python
USER_MANAGE_SUPERVISORS = "user:manage_supervisors"  # Admin-only
USER_RESET_PASSWORD = "user:reset_password"  # Password reset capability
```

### Frontend Components
- **Permission Guards**: Wrap UI elements based on user permissions
- **Role Checks**: Dynamic UI based on current user role
- **Action Validation**: Client-side validation before API calls

## Best Practices

### For Administrators
1. **Regular Audits**: Review user management audit logs regularly
2. **Principle of Least Privilege**: Assign minimum necessary role for each user
3. **Password Policies**: Ensure users change default passwords promptly
4. **Account Cleanup**: Regularly review and deactivate unused accounts

### For Developers
1. **Permission Checks**: Always validate permissions on both frontend and backend
2. **Audit Logging**: Log all sensitive operations for security compliance
3. **Error Handling**: Provide clear, actionable error messages
4. **Testing**: Test all permission combinations thoroughly

## Migration Guide

### Existing Installations
1. **Database Migration**: Add `force_password_change` column to users table
2. **Permission Update**: Existing supervisors automatically get new restricted permissions
3. **UI Update**: Frontend automatically adapts to new permission system
4. **No Data Loss**: All existing functionality preserved with enhanced security

### Rollback Procedure
If rollback is needed:
1. Remove `force_password_change` column (optional)
2. Revert RBAC permission changes
3. Remove supervisor restriction checks
4. Restore original UI components

This RBAC system provides a secure, scalable foundation for user management while maintaining clear separation of responsibilities across different organizational roles.
