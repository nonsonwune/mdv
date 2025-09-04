# MDV E-commerce Platform - Comprehensive Audit Logging System

## Overview

The MDV audit logging system provides comprehensive tracking of all user activities across the entire e-commerce platform. It captures staff and customer interactions for compliance, security investigations, and operational monitoring while maintaining performance and user experience.

## Architecture

### Components

1. **Enhanced Database Schema** (`backend/mdv/models.py`)
   - Comprehensive `AuditLog` model with detailed fields
   - Enum types for actions, entities, and status
   - Optimized indexes for performance

2. **Audit Service Layer** (`backend/mdv/audit.py`)
   - Core audit logging functionality
   - Context management for request tracking
   - Automatic metadata capture

3. **Audit Decorators** (`backend/mdv/audit_decorators.py`)
   - Easy integration with existing endpoints
   - Automatic before/after state capture
   - Error handling and logging

4. **Frontend Event Tracking** (`web/lib/audit.ts`)
   - Client-side event tracking
   - Batch processing and offline support
   - React integration components

5. **Admin Interface** (`web/app/admin/audit/page.tsx`)
   - Comprehensive audit log viewer
   - Advanced filtering and search
   - Detailed log inspection

6. **Security Controls** (`backend/mdv/audit_security.py`)
   - Data encryption and anonymization
   - Access controls and permissions
   - Retention policies and cleanup

## Data Structure

### Audit Log Fields

```typescript
interface AuditLog {
  // Basic Information
  id: number;
  created_at: datetime;
  
  // Actor Information
  actor_id?: number;
  actor_role?: string;
  actor_email?: string;
  
  // Action Details
  action: AuditAction;
  entity: AuditEntity;
  entity_id?: number;
  
  // Data Changes
  before?: object;
  after?: object;
  changes?: object;
  
  // Request Context
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  
  // Status and Metadata
  status: AuditStatus;
  error_message?: string;
  metadata?: object;
}
```

### Supported Actions

- **Authentication**: LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE
- **CRUD Operations**: CREATE, READ, UPDATE, DELETE, BULK_UPDATE, BULK_DELETE
- **Order Management**: ORDER_STATUS_CHANGE, PAYMENT_STATUS_CHANGE, ORDER_CANCEL, ORDER_REFUND
- **Inventory**: STOCK_ADJUSTMENT, INVENTORY_UPDATE
- **System**: SYSTEM_CONFIG_CHANGE, ROLE_CHANGE, PERMISSION_CHANGE
- **Customer**: CART_ADD, CART_REMOVE, CART_UPDATE, REVIEW_CREATE

### Supported Entities

- USER, ORDER, PRODUCT, VARIANT, CATEGORY
- CART, CART_ITEM, REVIEW, INVENTORY
- COUPON, SHIPMENT, RETURN, SYSTEM

## Implementation Guide

### Backend Integration

#### 1. Using Audit Decorators

```python
from mdv.audit_decorators import audit_endpoint, audit_data_change
from mdv.models import AuditAction, AuditEntity

@audit_endpoint(
    action=AuditAction.UPDATE,
    entity=AuditEntity.ORDER,
    entity_id_param="order_id"
)
async def update_order(order_id: int, data: OrderUpdate):
    # Your existing logic
    pass
```

#### 2. Manual Audit Logging

```python
from mdv.audit import AuditService

await AuditService.log_event(
    action=AuditAction.ORDER_STATUS_CHANGE,
    entity=AuditEntity.ORDER,
    entity_id=order_id,
    before={"status": "pending"},
    after={"status": "paid"},
    metadata={"payment_method": "paystack"}
)
```

#### 3. Authentication Events

```python
from mdv.audit import audit_login, audit_logout

# Login success
await audit_login(user, success=True)

# Login failure
await audit_login(user, success=False, error_message="Invalid password")

# Logout
await audit_logout(user)
```

### Frontend Integration

#### 1. Setup Audit Provider

```tsx
import { AuditProvider } from '@/components/AuditProvider';

function App() {
  return (
    <AuditProvider user={{ id: 1, role: 'admin', email: 'admin@mdv.ng' }}>
      {/* Your app components */}
    </AuditProvider>
  );
}
```

#### 2. Track User Actions

```tsx
import { useAudit } from '@/components/AuditProvider';

function OrderComponent() {
  const audit = useAudit();
  
  const handleOrderUpdate = async () => {
    try {
      await updateOrder(orderId, data);
      audit.trackOrderAction(orderId, 'status_update', { newStatus: 'shipped' });
    } catch (error) {
      audit.trackError(error, 'order_update');
    }
  };
}
```

#### 3. Automatic Page Tracking

```tsx
import { trackPageView } from '@/lib/audit';

useEffect(() => {
  trackPageView('/admin/orders');
}, []);
```

## Security and Privacy

### Access Controls

- **Admin**: Full access to all audit logs
- **Supervisor**: Access to non-admin actions
- **Operations**: Order and inventory logs only
- **Logistics**: Shipping and fulfillment logs only
- **Customer**: Own actions only

### Data Protection

1. **Encryption**: Sensitive data encrypted at rest
2. **Anonymization**: PII masked for non-admin users
3. **Retention Policies**: Automatic cleanup based on data type
4. **Integrity**: Tamper-proof hashing for critical logs

### Compliance Features

- **GDPR**: Data export and anonymization utilities
- **SOX**: Financial transaction audit trails
- **PCI DSS**: Payment data protection
- **Data Breach**: Automated notification system

## Performance Considerations

### Database Optimization

- Partitioned tables by date for large datasets
- Optimized indexes for common query patterns
- Async logging to prevent blocking operations
- Batch processing for high-volume events

### Caching Strategy

- Redis caching for frequently accessed logs
- Pagination for large result sets
- Lazy loading for detailed views
- Background processing for analytics

## Monitoring and Alerting

### Key Metrics

- Audit log volume and growth rate
- Failed audit operations
- Suspicious activity patterns
- System performance impact

### Alerts

- Failed login attempts exceeding threshold
- Unusual admin activity patterns
- Audit system failures or errors
- Data retention policy violations

## API Endpoints

### Admin Audit API

```
GET /api/admin/audit/logs
GET /api/admin/audit/logs/{id}
GET /api/admin/audit/stats
GET /api/admin/audit/actions
GET /api/admin/audit/entities
POST /api/admin/audit/events
```

### Query Parameters

- `page`, `per_page`: Pagination
- `actor_id`: Filter by user
- `action`: Filter by action type
- `entity`: Filter by entity type
- `status`: Filter by success/failure
- `date_from`, `date_to`: Date range
- `search`: Full-text search

## Configuration

### Environment Variables

```bash
# Audit System Configuration
AUDIT_ENCRYPTION_KEY=your-encryption-key
AUDIT_INTEGRITY_KEY=your-integrity-key
AUDIT_RETENTION_DAYS=365
AUDIT_BATCH_SIZE=100
AUDIT_FLUSH_INTERVAL=5000

# Database Configuration
AUDIT_DB_PARTITION_SIZE=1000000
AUDIT_INDEX_MAINTENANCE=true
```

### Feature Flags

```python
# Enable/disable audit features
AUDIT_ENABLED = True
AUDIT_FRONTEND_TRACKING = True
AUDIT_ENCRYPTION = True
AUDIT_ANONYMIZATION = True
AUDIT_RETENTION_CLEANUP = True
```

## Troubleshooting

### Common Issues

1. **High Database Load**
   - Check index usage
   - Review partition strategy
   - Optimize query patterns

2. **Missing Audit Logs**
   - Verify decorator placement
   - Check error logs
   - Validate permissions

3. **Performance Impact**
   - Enable async logging
   - Increase batch sizes
   - Review retention policies

### Debug Mode

```python
# Enable detailed audit logging
import logging
logging.getLogger('mdv.audit').setLevel(logging.DEBUG)
```

## Migration Guide

### From Basic to Enhanced Audit

1. Run database migration: `alembic upgrade enhance_audit_log_schema`
2. Update existing audit calls to use new service
3. Add decorators to critical endpoints
4. Configure security settings
5. Set up retention policies

### Testing Migration

```bash
# Test audit functionality
pytest tests/test_audit.py -v

# Test performance impact
pytest tests/test_audit_performance.py -v

# Test security controls
pytest tests/test_audit_security.py -v
```

## Best Practices

1. **Always audit critical operations** (payments, user management, data changes)
2. **Use appropriate action types** for better categorization
3. **Include meaningful metadata** for context
4. **Handle audit failures gracefully** without breaking core functionality
5. **Regular review and cleanup** of audit logs
6. **Monitor performance impact** and optimize as needed
7. **Test audit functionality** in all environments
8. **Document custom audit implementations** for maintenance

## Support and Maintenance

- Regular review of audit log patterns
- Performance monitoring and optimization
- Security assessment and updates
- Compliance requirement updates
- User training and documentation updates
