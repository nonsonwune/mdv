# Authentication & Authorization System

## Overview

The MDV application uses a role-based authentication system with JWT tokens stored in HTTP-only cookies. The system supports multiple user roles with different permission levels.

## User Roles

### Staff Roles (Admin Access)
All staff roles have access to the admin dashboard with different permission levels:

- **`admin`**: Full system access, can manage all resources including users
- **`supervisor`**: Can manage products, orders, and view analytics  
- **`operations`**: Can manage orders, inventory, and fulfillment
- **`logistics`**: Can manage inventory, shipping, and fulfillment

### Customer Role
- **`customer`**: Regular customers with access to store, account, and checkout

## Authentication Flow

### 1. Login Process
```
User submits credentials → Backend validates → JWT token created → 
Cookie set (mdv_token, mdv_role) → User redirected to appropriate dashboard
```

### 2. Staff vs Customer Login
- **Staff Login**: `/staff-login` → Redirects to `/admin`
- **Customer Login**: `/customer-login` → Redirects to `/account`

### 3. Session Management
- Tokens stored in HTTP-only cookies for security
- Automatic redirect to login when sessions expire
- Graceful handling of authentication errors

## Authorization System

### Permission Matrix

| Permission | Admin | Supervisor | Operations | Logistics | Customer |
|------------|-------|------------|------------|-----------|----------|
| `view_admin` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `manage_products` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `manage_orders` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `manage_users` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `view_analytics` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `manage_fulfillment` | ✅ | ❌ | ✅ | ✅ | ❌ |

### Using Permissions in Components
```typescript
import { usePermission } from '@/lib/auth-context'

function MyComponent() {
  const canManageProducts = usePermission('manage_products')
  
  return (
    <div>
      {canManageProducts && (
        <button>Add Product</button>
      )}
    </div>
  )
}
```

## API Authentication

### Frontend API Calls
- API client automatically includes JWT token from cookies
- Handles 401 errors by redirecting to appropriate login page
- Differentiates between staff and customer authentication failures

### Backend Endpoints
- All admin endpoints require valid JWT token
- Role-based access control on sensitive operations
- Automatic token validation and user context injection

## Error Handling

### Authentication Errors
- **401 Unauthorized**: Session expired or invalid token
- **403 Forbidden**: Valid token but insufficient permissions
- **Network Errors**: Handled gracefully with retry logic

### Error Recovery
- Automatic redirect to login on authentication failure
- Helpful error messages for users
- Silent handling of expected authentication failures

## Security Features

### Token Management
- HTTP-only cookies prevent XSS attacks
- Secure flag set in production
- SameSite protection against CSRF
- Automatic expiration and cleanup

### Route Protection
- Admin routes protected by role checking
- Public routes accessible without authentication
- Graceful degradation for unauthenticated users

## Troubleshooting

### Common Issues

1. **Authentication Loop**: 
   - **Cause**: User role not in allowed staff roles
   - **Solution**: Verify role is in `['admin', 'supervisor', 'operations', 'logistics']`

2. **403 Forbidden on Admin Pages**:
   - **Cause**: Valid login but insufficient permissions
   - **Solution**: Check permission matrix and user role

3. **Token Expiration**:
   - **Cause**: Long inactivity or server restart
   - **Solution**: User redirected to login, re-authentication required

### Debug Authentication
```typescript
// Check current auth state
import { useAuth } from '@/lib/auth-context'

function DebugAuth() {
  const { user, isAuthenticated, isStaff } = useAuth()
  console.log('User:', user)
  console.log('Authenticated:', isAuthenticated)  
  console.log('Is Staff:', isStaff)
}
```

## Recent Fixes (2024-08-27)

### Authentication Loop Fix
- **Issue**: Operations/logistics staff couldn't access admin dashboard
- **Cause**: Admin layout only allowed admin/supervisor roles
- **Fix**: Updated to allow all staff roles as defined in auth context
- **Files**: `web/app/admin/layout.tsx`, `web/lib/auth-context.tsx`

### Error Handling Improvements  
- Added graceful 401 handling on public pages
- Improved checkout error messages for empty cart
- Enhanced staff login with explicit styling and error states
- Consistent authentication error handling across admin pages
