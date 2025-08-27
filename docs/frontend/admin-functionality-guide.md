# Admin Functionality Guide

## Overview
This guide documents all administrative functions available in the MDV system. Only users with the `admin` role can access these features.

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [User Management](#user-management)
3. [Order Management](#order-management)
4. [System Administration](#system-administration)
5. [API Reference](#api-reference)
6. [Security Considerations](#security-considerations)

---

## Authentication & Authorization

### Role Hierarchy
The system has four user roles with different access levels:

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| **admin** | Full System Access | All features including user management, system configuration |
| **supervisor** | Management Access | Order management, fulfillment, refunds, cancellations |
| **operations** | Operational Access | Order processing, fulfillment tasks |
| **logistics** | Logistics Access | Shipment management, tracking updates |

### Admin Login
```bash
# Login as admin
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mdv.ng", "password": "your_password"}'
```

Response includes a JWT token to use for authenticated requests.

---

## User Management

### 1. Create Supervisor Users
Admins can create new supervisor accounts with a simplified endpoint:

```bash
curl -X POST http://localhost:8000/api/admin/users/supervisor \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Supervisor",
    "email": "john.supervisor@mdv.ng",
    "password": "secure_password123"
  }'
```

### 2. Create Any User Type
Create users with any role (admin, supervisor, operations, logistics):

```bash
curl -X POST http://localhost:8000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Operations",
    "email": "jane.ops@mdv.ng",
    "role": "operations",
    "password": "secure_password123",
    "active": true
  }'
```

### 3. Bulk User Creation
Create multiple users at once:

```bash
curl -X POST http://localhost:8000/api/admin/users/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {
        "name": "User One",
        "email": "user1@mdv.ng",
        "role": "operations",
        "password": "password123",
        "active": true
      },
      {
        "name": "User Two",
        "email": "user2@mdv.ng",
        "role": "logistics",
        "password": "password123",
        "active": true
      }
    ]
  }'
```

### 4. User Management Operations

#### List All Users
```bash
curl -X GET "http://localhost:8000/api/admin/users?page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Query parameters:
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)
- `role`: Filter by role (admin/supervisor/operations/logistics)
- `active`: Filter by active status (true/false)
- `search`: Search by name or email

#### Get User Statistics
```bash
curl -X GET http://localhost:8000/api/admin/users/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns:
- Total users count
- Active/inactive users
- Users by role
- Recently created users (last 30 days)

#### Update User
```bash
curl -X PUT http://localhost:8000/api/admin/users/{user_id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "newemail@mdv.ng",
    "role": "supervisor",
    "active": true
  }'
```

#### Change User Role
```bash
curl -X POST http://localhost:8000/api/admin/users/{user_id}/change-role \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '"supervisor"'
```

#### Deactivate User
```bash
curl -X DELETE http://localhost:8000/api/admin/users/{user_id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Activate User
```bash
curl -X POST http://localhost:8000/api/admin/users/{user_id}/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Reset User Password
```bash
curl -X POST http://localhost:8000/api/admin/users/{user_id}/reset-password \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns a temporary password to share with the user.

---

## Order Management

### Admin Order Functions

#### List All Orders
```bash
curl -X GET "http://localhost:8000/api/admin/orders?status=paid&page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Cancel Order (Supervisor+)
```bash
curl -X POST http://localhost:8000/api/admin/orders/{order_id}/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Process Refund (Supervisor+)
```bash
curl -X POST http://localhost:8000/api/admin/orders/{order_id}/refund \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000.00,
    "reason": "Customer request",
    "method": "paystack"
  }'
```

### Fulfillment Management

#### Mark Ready to Ship (Operations+)
```bash
curl -X POST http://localhost:8000/api/admin/fulfillments/{id}/ready \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Shipment Management

#### Create Shipment (Logistics+)
```bash
curl -X POST http://localhost:8000/api/admin/shipments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fulfillment_id": 1,
    "courier": "DHL",
    "tracking_id": "DHL123456789"
  }'
```

#### Update Shipment Status (Logistics+)
```bash
curl -X POST http://localhost:8000/api/admin/shipments/{id}/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_transit"
  }'
```

---

## System Administration

### Audit Logs
All admin actions are logged in the `audit_logs` table with:
- Actor ID (who performed the action)
- Action type
- Entity affected
- Before/after state
- Timestamp

### Database Management
Admins should have access to:
- View audit logs
- Monitor system health
- Manage database backups
- Configure system settings

---

## API Reference

### Admin User Management Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/admin/users` | List all users | admin |
| GET | `/api/admin/users/stats` | Get user statistics | admin |
| GET | `/api/admin/users/{id}` | Get specific user | admin |
| POST | `/api/admin/users` | Create new user | admin |
| POST | `/api/admin/users/supervisor` | Create supervisor | admin |
| POST | `/api/admin/users/bulk` | Bulk create users | admin |
| PUT | `/api/admin/users/{id}` | Update user | admin |
| DELETE | `/api/admin/users/{id}` | Deactivate user | admin |
| POST | `/api/admin/users/{id}/activate` | Activate user | admin |
| POST | `/api/admin/users/{id}/change-role` | Change user role | admin |
| POST | `/api/admin/users/{id}/reset-password` | Reset password | admin |

### Admin Order Management Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/admin/orders` | List all orders | All staff |
| POST | `/api/admin/orders/{id}/cancel` | Cancel order | supervisor+ |
| POST | `/api/admin/orders/{id}/refund` | Process refund | supervisor+ |
| POST | `/api/admin/fulfillments/{id}/ready` | Mark ready to ship | operations+ |
| POST | `/api/admin/shipments` | Create shipment | logistics+ |
| POST | `/api/admin/shipments/{id}/status` | Update shipment | logistics+ |

---

## Security Considerations

### Best Practices
1. **Password Security**
   - Currently using SHA256 hashing (temporary)
   - Should upgrade to bcrypt for production
   - Enforce strong password policies
   - Regular password rotation

2. **Access Control**
   - Role-based access control (RBAC) enforced
   - JWT tokens with expiration
   - Audit logging for all admin actions
   - Cannot self-demote or self-deactivate

3. **API Security**
   - All admin endpoints require authentication
   - Rate limiting should be implemented
   - HTTPS required in production
   - CORS properly configured

### Restrictions
- Admins cannot:
  - Delete their own account
  - Deactivate themselves
  - Change their own role (prevent accidental lockout)
  - View passwords (only reset them)

### Monitoring
- All admin actions are logged
- Failed authentication attempts should be monitored
- Regular audit log reviews
- Alert on suspicious activities

---

## Testing Admin Functions

### Quick Test Script
Run the provided test script to verify all admin functions:

```bash
cd /Users/mac/Repository/mdv/backend
python scripts/test_admin_functions.py
```

### Manual Testing Checklist
- [ ] Login as admin
- [ ] Create a supervisor user
- [ ] Create regular users (operations, logistics)
- [ ] Update user details
- [ ] Change user roles
- [ ] Deactivate/activate users
- [ ] Reset user passwords
- [ ] View user statistics
- [ ] Test bulk operations
- [ ] Verify audit logging

---

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check token is valid and not expired
   - Ensure user has admin role

2. **403 Forbidden**
   - User doesn't have required role
   - Trying to perform restricted action (self-deletion)

3. **400 Bad Request**
   - Email already exists
   - Invalid role specified
   - Missing required fields

4. **404 Not Found**
   - User ID doesn't exist
   - Endpoint URL incorrect

---

## Future Enhancements

### Planned Features
1. **Enhanced Security**
   - Implement bcrypt password hashing
   - Two-factor authentication
   - Session management
   - IP whitelisting for admin access

2. **Advanced User Management**
   - User groups/departments
   - Permission templates
   - Bulk import from CSV
   - User activity tracking

3. **Reporting**
   - User activity reports
   - Login history
   - Permission audit reports
   - Role usage analytics

4. **Integration**
   - LDAP/Active Directory integration
   - Single Sign-On (SSO)
   - External identity providers
   - API key management

---

## Support

For issues or questions regarding admin functionality:
1. Check the audit logs for error details
2. Review the API documentation
3. Test with the provided scripts
4. Contact system administrator

---

*Last Updated: 2025-08-25*
