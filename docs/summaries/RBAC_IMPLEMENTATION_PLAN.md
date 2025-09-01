# RBAC Implementation Plan & Testing Guide

## 🎯 Implementation Summary

### ✅ Completed (Phase 1)

#### **Payment Status Restrictions**
- **Backend**: Added role-based payment status modification restrictions
- **Frontend**: Updated order detail page with permission-based UI
- **Security**: Only Admin users can modify payment status for non-Paystack orders
- **Protection**: Paystack orders are read-only for all users (including Admin)

#### **Basic Logistics Dashboard**
- **Frontend**: Created `/admin/logistics` dashboard page
- **Backend**: Added logistics-specific API endpoints
- **Navigation**: Added logistics section to admin navigation
- **Permissions**: Restricted to Admin, Supervisor, and Logistics roles

### 🔄 Implementation Details

#### **Backend Changes**

**File**: `backend/api/routers/admin.py`
```python
# Payment status restrictions
if body.payment_status is not None:
    if user_role == "admin":
        is_paystack_order = bool(order.payment_ref)
        if not is_paystack_order:
            can_modify_payment = True
        else:
            raise HTTPException(403, "Cannot modify Paystack orders")
    else:
        raise HTTPException(403, "Only Admin users can modify payment status")

# New logistics endpoints
@router.get("/logistics/stats", dependencies=[Depends(require_roles(*LOGISTICS_STAFF))])
@router.get("/logistics/ready-to-ship", dependencies=[Depends(require_roles(*LOGISTICS_STAFF))])
```

#### **Frontend Changes**

**File**: `web/app/admin/orders/[id]/page.tsx`
```typescript
// Role-based payment status field
{user?.role === 'admin' && !order.payment_ref ? (
  <select>...</select>
) : (
  <div className="bg-gray-50">
    {order.payment_ref 
      ? "Paystack orders are read-only" 
      : "Only Admin users can modify payment status"
    }
  </div>
)}
```

**File**: `web/app/admin/logistics/page.tsx`
- Complete logistics dashboard with shipment statistics
- Ready-to-ship orders table
- Role-based access control
- Error handling and loading states

## 🧪 Testing Plan

### **Security Testing**

#### **Payment Status Restrictions**
```bash
# Test 1: Non-admin user tries to modify payment status
curl -X PUT /api/admin/orders/1 \
  -H "Authorization: Bearer <logistics_token>" \
  -d '{"payment_status": "paid"}'
# Expected: 403 Forbidden

# Test 2: Admin tries to modify Paystack order
curl -X PUT /api/admin/orders/2 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"payment_status": "paid"}'
# Expected: 403 Forbidden (if order has payment_ref)

# Test 3: Admin modifies non-Paystack order
curl -X PUT /api/admin/orders/3 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"payment_status": "paid"}'
# Expected: 200 OK (if order has no payment_ref)
```

#### **Logistics Access Control**
```bash
# Test 4: Logistics user accesses logistics dashboard
curl -X GET /api/admin/logistics/stats \
  -H "Authorization: Bearer <logistics_token>"
# Expected: 200 OK

# Test 5: Operations user tries to access logistics
curl -X GET /api/admin/logistics/stats \
  -H "Authorization: Bearer <operations_token>"
# Expected: 403 Forbidden
```

### **Functional Testing**

#### **Frontend UI Tests**
1. **Payment Status Field**
   - [ ] Admin user sees editable dropdown for non-Paystack orders
   - [ ] Admin user sees read-only field for Paystack orders
   - [ ] Non-admin users see read-only field with explanation
   - [ ] Proper error messages displayed

2. **Logistics Dashboard**
   - [ ] Logistics users can access `/admin/logistics`
   - [ ] Statistics display correctly
   - [ ] Ready-to-ship orders table populates
   - [ ] Non-logistics users get access denied message

3. **Navigation**
   - [ ] Logistics menu item appears for appropriate roles
   - [ ] Menu item hidden for operations users
   - [ ] Proper role-based navigation rendering

#### **Backend API Tests**
1. **Logistics Endpoints**
   - [ ] `/api/admin/logistics/stats` returns correct data structure
   - [ ] `/api/admin/logistics/ready-to-ship` returns orders with fulfillment ready
   - [ ] Proper pagination for ready-to-ship orders
   - [ ] Error handling for database failures

2. **Order Update Endpoint**
   - [ ] Payment status restrictions enforced
   - [ ] Audit logs created for payment status changes
   - [ ] Other order fields still updateable by appropriate roles

### **Integration Testing**

#### **End-to-End Workflows**
1. **Payment Status Workflow**
   - [ ] Create order with manual payment method
   - [ ] Admin can change payment status
   - [ ] Non-admin cannot change payment status
   - [ ] Paystack webhook updates are protected

2. **Logistics Workflow**
   - [ ] Order moves to ready-to-ship status
   - [ ] Appears in logistics dashboard
   - [ ] Logistics user can create shipment
   - [ ] Order disappears from ready-to-ship list

## 🚀 Deployment Checklist

### **Pre-Deployment**
- [ ] Run all security tests
- [ ] Verify database migrations (if any)
- [ ] Test with production-like data
- [ ] Validate role assignments in production

### **Deployment Steps**
1. [ ] Deploy backend changes
2. [ ] Deploy frontend changes
3. [ ] Verify logistics dashboard loads
4. [ ] Test payment status restrictions
5. [ ] Monitor error logs

### **Post-Deployment Verification**
- [ ] Admin users can access all functions
- [ ] Logistics users can access logistics dashboard
- [ ] Operations users cannot modify payment status
- [ ] Paystack orders remain protected
- [ ] Audit logs are being created

## 🔮 Future Enhancements (Phase 2)

### **Advanced Logistics Features**
1. **Shipment Creation Workflow**
   - Modal for creating shipments from ready-to-ship orders
   - Carrier selection and tracking number input
   - Automatic status updates

2. **Delivery Tracking**
   - Real-time shipment status updates
   - Customer notification system
   - Delivery confirmation workflow

3. **Warehouse Management**
   - Picking and packing workflows
   - Inventory location tracking
   - Barcode scanning integration

### **Enhanced Permissions**
1. **Granular Permissions**
   - Resource-level access control
   - Time-based permissions
   - Approval workflows

2. **Audit Improvements**
   - Detailed permission audit trails
   - Role change notifications
   - Security event monitoring

## 📊 Success Metrics

### **Security Metrics**
- **Payment Status Violations**: 0 unauthorized modifications
- **Access Control Violations**: 0 role boundary breaches
- **Audit Coverage**: 100% of sensitive operations logged

### **User Experience Metrics**
- **Logistics User Satisfaction**: >4.5/5
- **Task Completion Rate**: >90% for logistics workflows
- **Error Rate**: <1% for role-based operations

### **Performance Metrics**
- **Dashboard Load Time**: <2 seconds
- **API Response Time**: <500ms for logistics endpoints
- **Database Query Performance**: No degradation

## 🔧 Troubleshooting Guide

### **Common Issues**

#### **"Access Denied" Errors**
- Verify user role in JWT token
- Check role assignments in database
- Validate permission mappings

#### **Payment Status Not Updating**
- Check if order has payment_ref (Paystack order)
- Verify user has admin role
- Review audit logs for error details

#### **Logistics Dashboard Empty**
- Verify orders have fulfillment records
- Check fulfillment status is ready_to_ship
- Ensure no existing shipments for orders

This implementation provides a solid foundation for role-based access control while addressing the critical security issues around payment status modifications and providing essential logistics functionality.
