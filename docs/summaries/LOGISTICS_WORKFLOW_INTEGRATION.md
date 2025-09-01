# Logistics Workflow Integration Guide

## 🔄 **Order to Logistics Workflow**

This document explains how order status updates integrate with the logistics dashboard and fulfillment workflow.

## 📋 **Workflow States**

### **Order Status Flow**
```
Pending Payment → Paid → Processing → Shipped → Delivered
                    ↓
                Cancelled/Refunded
```

### **Fulfillment Status Flow**
```
Processing → Ready to Ship → [Shipment Created] → Dispatched → Delivered
```

### **Integration Points**
```
Order Status: "Processing" → Fulfillment Status: "Ready to Ship"
Order Status: "Shipped"    → Shipment Created
Order Status: "Delivered"  → Shipment Status: "Delivered"
```

## 🔧 **Implementation Details**

### **Backend Integration** (`backend/api/routers/admin.py`)

#### **Order Status Update Logic**
When an order status is updated via the admin interface:

```python
# Handle fulfillment workflow based on order status updates
if body.status is not None and body.status in {"processing", "shipped", "delivered"}:
    # Ensure fulfillment exists for workflow statuses
    if not order.fulfillment:
        order.fulfillment = Fulfillment(
            order_id=order.id,
            status=FulfillmentStatus.processing,
            packed_by=actor_id,
            packed_at=datetime.now(timezone.utc),
            notes=body.notes or None,
        )
    
    # Update fulfillment status based on UI status
    if body.status == "processing":
        # Mark as ready to ship when order status is set to processing
        order.fulfillment.status = FulfillmentStatus.ready_to_ship
        order.fulfillment.packed_by = actor_id
        order.fulfillment.packed_at = datetime.now(timezone.utc)
```

#### **Logistics Dashboard Queries**
The logistics dashboard shows orders that are:
- Have `Fulfillment.status == FulfillmentStatus.ready_to_ship`
- Do NOT have an associated shipment yet

```python
# Get orders ready to ship
stmt = (
    select(Order, Address)
    .join(Fulfillment, Order.id == Fulfillment.order_id)
    .join(Address, Order.id == Address.order_id)
    .where(
        and_(
            Fulfillment.status == FulfillmentStatus.ready_to_ship,
            ~Fulfillment.id.in_(select(Shipment.fulfillment_id))
        )
    )
)
```

### **Frontend Integration** (`web/app/admin/logistics/page.tsx`)

#### **Auto-Refresh Mechanism**
```typescript
// Auto-refresh every 30 seconds to catch order status updates
useEffect(() => {
  const interval = setInterval(() => {
    fetchLogisticsData()
  }, 30000) // 30 seconds

  return () => clearInterval(interval)
}, [])
```

#### **Manual Refresh Button**
Users can manually refresh the logistics dashboard to see immediate updates.

## 🎯 **User Workflow**

### **For Operations Users**
1. **Order Processing**: Set order status to "Processing" on order detail page
2. **Automatic Trigger**: This automatically sets fulfillment status to "Ready to Ship"
3. **Logistics Visibility**: Order now appears in logistics dashboard

### **For Logistics Users**
1. **Dashboard View**: See all orders ready to ship in logistics dashboard
2. **Shipment Creation**: Click "Create Shipment" for orders ready to dispatch
3. **Status Updates**: Update shipment status as packages move through delivery

### **For Admin/Supervisor Users**
1. **Full Visibility**: Can see and manage all aspects of the workflow
2. **Override Capability**: Can manually adjust fulfillment and shipment statuses
3. **Monitoring**: Can track workflow efficiency and bottlenecks

## 📊 **Status Mapping Reference**

### **Order Status → Fulfillment Status**
| Order Status | Fulfillment Status | Logistics Dashboard | Notes |
|--------------|-------------------|-------------------|-------|
| Pending Payment | N/A | ❌ Not shown | No fulfillment created |
| Paid | Processing | ❌ Not shown | Fulfillment created but not ready |
| **Processing** | **Ready to Ship** | ✅ **Shown** | **Available for shipment** |
| Shipped | Ready to Ship | ❌ Not shown | Shipment created |
| Delivered | Ready to Ship | ❌ Not shown | Shipment delivered |
| Cancelled | N/A | ❌ Not shown | Workflow terminated |

### **Fulfillment Status → Logistics Visibility**
| Fulfillment Status | Has Shipment | Logistics Dashboard | Action Available |
|-------------------|--------------|-------------------|------------------|
| Processing | No | ❌ Not shown | Wait for ready status |
| **Ready to Ship** | **No** | ✅ **Shown** | **Create Shipment** |
| Ready to Ship | Yes | ❌ Not shown | Shipment in progress |

## 🔄 **Complete Workflow Example**

### **Scenario**: New order fulfillment process

1. **Customer Places Order**
   - Order Status: `Pending Payment`
   - Fulfillment: None
   - Logistics Dashboard: Not visible

2. **Payment Confirmed** (Paystack webhook)
   - Order Status: `Paid`
   - Fulfillment: `Processing` (auto-created)
   - Logistics Dashboard: Not visible

3. **Operations Marks as Processing**
   - Order Status: `Processing` (via admin UI)
   - Fulfillment: `Ready to Ship` (auto-updated)
   - Logistics Dashboard: ✅ **Now visible**

4. **Logistics Creates Shipment**
   - Order Status: `Processing`
   - Fulfillment: `Ready to Ship`
   - Shipment: `Dispatched` (created)
   - Logistics Dashboard: No longer visible (has shipment)

5. **Package Delivered**
   - Order Status: `Delivered` (via admin UI)
   - Shipment: `Delivered` (updated)
   - Workflow: Complete

## 🚨 **Troubleshooting**

### **Order Not Appearing in Logistics Dashboard**

#### **Check 1: Order Status**
- Verify order status is set to "Processing" or higher
- Ensure order has been paid (not pending payment)

#### **Check 2: Fulfillment Status**
- Check if fulfillment record exists
- Verify fulfillment status is "Ready to Ship"
- Confirm fulfillment was created when order status changed

#### **Check 3: Shipment Status**
- Ensure no shipment record exists for the fulfillment
- If shipment exists, order won't appear in ready-to-ship queue

#### **Check 4: Database Consistency**
```sql
-- Check order and fulfillment status
SELECT o.id, o.status as order_status, f.status as fulfillment_status, s.id as shipment_id
FROM orders o
LEFT JOIN fulfillments f ON o.id = f.order_id
LEFT JOIN shipments s ON f.id = s.fulfillment_id
WHERE o.id = [ORDER_ID];
```

### **Common Issues & Solutions**

#### **Issue**: Order marked as "Processing" but not in logistics dashboard
**Solution**: Check if fulfillment status was properly updated to "Ready to Ship"

#### **Issue**: Order disappeared from logistics dashboard
**Solution**: Check if shipment was created - orders with shipments don't appear in ready-to-ship queue

#### **Issue**: Logistics dashboard not updating
**Solution**: Use manual refresh button or wait for 30-second auto-refresh

## 🔮 **Future Enhancements**

### **Real-time Updates**
- WebSocket integration for instant dashboard updates
- Push notifications for new ready-to-ship orders

### **Advanced Workflow**
- Multi-step fulfillment process (picking, packing, quality check)
- Batch shipment creation for multiple orders
- Route optimization for deliveries

### **Analytics Integration**
- Fulfillment time tracking
- Logistics performance metrics
- Bottleneck identification

## 📈 **Success Metrics**

### **Workflow Efficiency**
- Time from "Paid" to "Ready to Ship": Target < 2 hours
- Time from "Ready to Ship" to "Dispatched": Target < 4 hours
- Order visibility in logistics dashboard: 100% accuracy

### **User Experience**
- Logistics dashboard refresh rate: Every 30 seconds
- Manual refresh response time: < 2 seconds
- Workflow completion rate: > 95%

This integration ensures seamless coordination between order management and logistics operations, providing clear visibility and efficient workflow management for all user roles.
