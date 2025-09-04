# Enum Usage Validation Report
==================================================

**Total Issues Found:** 313

- **Errors:** 32
- **Warnings:** 172
- **Info:** 109

## Incorrect Value Comparison (45 issues)

### test_enum_values.py:20
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Suggested Fix:** `assert OrderStatus.pending_payment == "PendingPayment"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:21
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.paid.value == "Paid"`
**Suggested Fix:** `assert OrderStatus.paid == "Paid"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:22
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.cancelled.value == "Cancelled"`
**Suggested Fix:** `assert OrderStatus.cancelled == "Cancelled"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:23
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.refunded.value == "Refunded"`
**Suggested Fix:** `assert OrderStatus.refunded == "Refunded"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:30
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Suggested Fix:** `assert FulfillmentStatus.processing == "Processing"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:31
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert FulfillmentStatus.ready_to_ship.value == "ReadyToShip"`
**Suggested Fix:** `assert FulfillmentStatus.ready_to_ship == "ReadyToShip"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:38
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Suggested Fix:** `assert ShipmentStatus.dispatched == "Dispatched"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:39
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.in_transit.value == "InTransit"`
**Suggested Fix:** `assert ShipmentStatus.in_transit == "InTransit"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:40
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.delivered.value == "Delivered"`
**Suggested Fix:** `assert ShipmentStatus.delivered == "Delivered"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:41
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.returned.value == "Returned"`
**Suggested Fix:** `assert ShipmentStatus.returned == "Returned"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:48
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Suggested Fix:** `assert ReservationStatus.active == "Active"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:49
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.released.value == "Released"`
**Suggested Fix:** `assert ReservationStatus.released == "Released"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:50
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.consumed.value == "Consumed"`
**Suggested Fix:** `assert ReservationStatus.consumed == "Consumed"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:51
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.expired.value == "Expired"`
**Suggested Fix:** `assert ReservationStatus.expired == "Expired"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:58
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert RefundMethod.paystack.value == "paystack"`
**Suggested Fix:** `assert RefundMethod.paystack == "paystack"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:59
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert RefundMethod.manual.value == "manual"`
**Suggested Fix:** `assert RefundMethod.manual == "manual"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:66
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.admin.value == "admin"`
**Suggested Fix:** `assert Role.admin == "admin"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:67
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.supervisor.value == "supervisor"`
**Suggested Fix:** `assert Role.supervisor == "supervisor"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:68
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.operations.value == "operations"`
**Suggested Fix:** `assert Role.operations == "operations"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:69
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.logistics.value == "logistics"`
**Suggested Fix:** `assert Role.logistics == "logistics"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:77
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Suggested Fix:** `assert OrderStatus.pending_payment == "PendingPayment"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:80
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Suggested Fix:** `assert FulfillmentStatus.processing == "Processing"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:83
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Suggested Fix:** `assert ShipmentStatus.dispatched == "Dispatched"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_values.py:86
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Suggested Fix:** `assert ReservationStatus.active == "Active"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:222
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Suggested Fix:** `assert OrderStatus.pending_payment == "PendingPayment"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:223
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.paid.value == "Paid"`
**Suggested Fix:** `assert OrderStatus.paid == "Paid"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:224
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.cancelled.value == "Cancelled"`
**Suggested Fix:** `assert OrderStatus.cancelled == "Cancelled"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:225
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert OrderStatus.refunded.value == "Refunded"`
**Suggested Fix:** `assert OrderStatus.refunded == "Refunded"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:228
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.admin.value == "admin"`
**Suggested Fix:** `assert Role.admin == "admin"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:229
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.supervisor.value == "supervisor"`
**Suggested Fix:** `assert Role.supervisor == "supervisor"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:230
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.operations.value == "operations"`
**Suggested Fix:** `assert Role.operations == "operations"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:231
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.logistics.value == "logistics"`
**Suggested Fix:** `assert Role.logistics == "logistics"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:232
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert Role.customer.value == "customer"`
**Suggested Fix:** `assert Role.customer == "customer"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:235
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Suggested Fix:** `assert ReservationStatus.active == "Active"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:236
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.released.value == "Released"`
**Suggested Fix:** `assert ReservationStatus.released == "Released"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:237
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.consumed.value == "Consumed"`
**Suggested Fix:** `assert ReservationStatus.consumed == "Consumed"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:238
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ReservationStatus.expired.value == "Expired"`
**Suggested Fix:** `assert ReservationStatus.expired == "Expired"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:241
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Suggested Fix:** `assert FulfillmentStatus.processing == "Processing"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:242
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert FulfillmentStatus.ready_to_ship.value == "ReadyToShip"`
**Suggested Fix:** `assert FulfillmentStatus.ready_to_ship == "ReadyToShip"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:245
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Suggested Fix:** `assert ShipmentStatus.dispatched == "Dispatched"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:246
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.in_transit.value == "InTransit"`
**Suggested Fix:** `assert ShipmentStatus.in_transit == "InTransit"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:247
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.delivered.value == "Delivered"`
**Suggested Fix:** `assert ShipmentStatus.delivered == "Delivered"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:248
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert ShipmentStatus.returned.value == "Returned"`
**Suggested Fix:** `assert ShipmentStatus.returned == "Returned"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:251
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert RefundMethod.paystack.value == "paystack"`
**Suggested Fix:** `assert RefundMethod.paystack == "paystack"`
**Context:** Enum comparisons should typically use enum members, not values

### test_enum_defaults_comprehensive.py:252
**Severity:** warning
**Description:** Using .value in enum comparison - consider using enum member directly
**Current Code:** `assert RefundMethod.manual.value == "manual"`
**Suggested Fix:** `assert RefundMethod.manual == "manual"`
**Context:** Enum comparisons should typically use enum members, not values

## String Literal Comparison (127 issues)

### test_enum_values.py:20
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Suggested Fix:** `assert OrderStatus.pending_payment.value == OrderStatus.pending_payment`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### test_enum_values.py:21
**Severity:** warning
**Description:** Using string literal 'Paid' instead of enum member
**Current Code:** `assert OrderStatus.paid.value == "Paid"`
**Suggested Fix:** `assert OrderStatus.paid.value == OrderStatus.paid`
**Context:** Consider using OrderStatus.paid instead of string literal

### test_enum_values.py:22
**Severity:** warning
**Description:** Using string literal 'Cancelled' instead of enum member
**Current Code:** `assert OrderStatus.cancelled.value == "Cancelled"`
**Suggested Fix:** `assert OrderStatus.cancelled.value == OrderStatus.cancelled`
**Context:** Consider using OrderStatus.cancelled instead of string literal

### test_enum_values.py:23
**Severity:** warning
**Description:** Using string literal 'Refunded' instead of enum member
**Current Code:** `assert OrderStatus.refunded.value == "Refunded"`
**Suggested Fix:** `assert OrderStatus.refunded.value == OrderStatus.refunded`
**Context:** Consider using OrderStatus.refunded instead of string literal

### test_enum_values.py:30
**Severity:** warning
**Description:** Using string literal 'Processing' instead of enum member
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Suggested Fix:** `assert FulfillmentStatus.processing.value == FulfillmentStatus.processing`
**Context:** Consider using FulfillmentStatus.processing instead of string literal

### test_enum_values.py:31
**Severity:** warning
**Description:** Using string literal 'ReadyToShip' instead of enum member
**Current Code:** `assert FulfillmentStatus.ready_to_ship.value == "ReadyToShip"`
**Suggested Fix:** `assert FulfillmentStatus.ready_to_ship.value == FulfillmentStatus.ready_to_ship`
**Context:** Consider using FulfillmentStatus.ready_to_ship instead of string literal

### test_enum_values.py:38
**Severity:** warning
**Description:** Using string literal 'Dispatched' instead of enum member
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Suggested Fix:** `assert ShipmentStatus.dispatched.value == ShipmentStatus.dispatched`
**Context:** Consider using ShipmentStatus.dispatched instead of string literal

### test_enum_values.py:39
**Severity:** warning
**Description:** Using string literal 'InTransit' instead of enum member
**Current Code:** `assert ShipmentStatus.in_transit.value == "InTransit"`
**Suggested Fix:** `assert ShipmentStatus.in_transit.value == ShipmentStatus.in_transit`
**Context:** Consider using ShipmentStatus.in_transit instead of string literal

### test_enum_values.py:40
**Severity:** warning
**Description:** Using string literal 'Delivered' instead of enum member
**Current Code:** `assert ShipmentStatus.delivered.value == "Delivered"`
**Suggested Fix:** `assert ShipmentStatus.delivered.value == ShipmentStatus.delivered`
**Context:** Consider using ShipmentStatus.delivered instead of string literal

### test_enum_values.py:41
**Severity:** warning
**Description:** Using string literal 'Returned' instead of enum member
**Current Code:** `assert ShipmentStatus.returned.value == "Returned"`
**Suggested Fix:** `assert ShipmentStatus.returned.value == ShipmentStatus.returned`
**Context:** Consider using ShipmentStatus.returned instead of string literal

### test_enum_values.py:48
**Severity:** warning
**Description:** Using string literal 'Active' instead of enum member
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Suggested Fix:** `assert ReservationStatus.active.value == ReservationStatus.active`
**Context:** Consider using ReservationStatus.active instead of string literal

### test_enum_values.py:49
**Severity:** warning
**Description:** Using string literal 'Released' instead of enum member
**Current Code:** `assert ReservationStatus.released.value == "Released"`
**Suggested Fix:** `assert ReservationStatus.released.value == ReservationStatus.released`
**Context:** Consider using ReservationStatus.released instead of string literal

### test_enum_values.py:50
**Severity:** warning
**Description:** Using string literal 'Consumed' instead of enum member
**Current Code:** `assert ReservationStatus.consumed.value == "Consumed"`
**Suggested Fix:** `assert ReservationStatus.consumed.value == ReservationStatus.consumed`
**Context:** Consider using ReservationStatus.consumed instead of string literal

### test_enum_values.py:51
**Severity:** warning
**Description:** Using string literal 'Expired' instead of enum member
**Current Code:** `assert ReservationStatus.expired.value == "Expired"`
**Suggested Fix:** `assert ReservationStatus.expired.value == ReservationStatus.expired`
**Context:** Consider using ReservationStatus.expired instead of string literal

### test_enum_values.py:58
**Severity:** warning
**Description:** Using string literal 'paystack' instead of enum member
**Current Code:** `assert RefundMethod.paystack.value == "paystack"`
**Suggested Fix:** `assert RefundMethod.paystack.value == RefundMethod.paystack`
**Context:** Consider using RefundMethod.paystack instead of string literal

### test_enum_values.py:59
**Severity:** warning
**Description:** Using string literal 'manual' instead of enum member
**Current Code:** `assert RefundMethod.manual.value == "manual"`
**Suggested Fix:** `assert RefundMethod.manual.value == RefundMethod.manual`
**Context:** Consider using RefundMethod.manual instead of string literal

### test_enum_values.py:66
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `assert Role.admin.value == "admin"`
**Suggested Fix:** `assert Role.admin.value == Role.admin`
**Context:** Consider using Role.admin instead of string literal

### test_enum_values.py:67
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `assert Role.supervisor.value == "supervisor"`
**Suggested Fix:** `assert Role.supervisor.value == Role.supervisor`
**Context:** Consider using Role.supervisor instead of string literal

### test_enum_values.py:68
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `assert Role.operations.value == "operations"`
**Suggested Fix:** `assert Role.operations.value == Role.operations`
**Context:** Consider using Role.operations instead of string literal

### test_enum_values.py:69
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `assert Role.logistics.value == "logistics"`
**Suggested Fix:** `assert Role.logistics.value == Role.logistics`
**Context:** Consider using Role.logistics instead of string literal

### test_enum_values.py:77
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Suggested Fix:** `assert OrderStatus.pending_payment.value == OrderStatus.pending_payment`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### test_enum_values.py:78
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `assert OrderStatus.pending_payment == "PendingPayment"  # This works because of str inheritance`
**Suggested Fix:** `assert OrderStatus.pending_payment == OrderStatus.pending_payment  # This works because of str inheritance`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### test_enum_values.py:80
**Severity:** warning
**Description:** Using string literal 'Processing' instead of enum member
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Suggested Fix:** `assert FulfillmentStatus.processing.value == FulfillmentStatus.processing`
**Context:** Consider using FulfillmentStatus.processing instead of string literal

### test_enum_values.py:81
**Severity:** warning
**Description:** Using string literal 'Processing' instead of enum member
**Current Code:** `assert FulfillmentStatus.processing == "Processing"`
**Suggested Fix:** `assert FulfillmentStatus.processing == FulfillmentStatus.processing`
**Context:** Consider using FulfillmentStatus.processing instead of string literal

### test_enum_values.py:83
**Severity:** warning
**Description:** Using string literal 'Dispatched' instead of enum member
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Suggested Fix:** `assert ShipmentStatus.dispatched.value == ShipmentStatus.dispatched`
**Context:** Consider using ShipmentStatus.dispatched instead of string literal

### test_enum_values.py:84
**Severity:** warning
**Description:** Using string literal 'Dispatched' instead of enum member
**Current Code:** `assert ShipmentStatus.dispatched == "Dispatched"`
**Suggested Fix:** `assert ShipmentStatus.dispatched == ShipmentStatus.dispatched`
**Context:** Consider using ShipmentStatus.dispatched instead of string literal

### test_enum_values.py:86
**Severity:** warning
**Description:** Using string literal 'Active' instead of enum member
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Suggested Fix:** `assert ReservationStatus.active.value == ReservationStatus.active`
**Context:** Consider using ReservationStatus.active instead of string literal

### test_enum_values.py:87
**Severity:** warning
**Description:** Using string literal 'Active' instead of enum member
**Current Code:** `assert ReservationStatus.active == "Active"`
**Suggested Fix:** `assert ReservationStatus.active == ReservationStatus.active`
**Context:** Consider using ReservationStatus.active instead of string literal

### test_audit_system.py:336
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `assert context.actor_role == "admin"`
**Suggested Fix:** `assert context.actor_role == Role.admin`
**Context:** Consider using Role.admin instead of string literal

### test_enum_defaults_comprehensive.py:40
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `assert order.status.value == "PendingPayment"`
**Suggested Fix:** `assert order.status.value == OrderStatus.pending_payment`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### test_enum_defaults_comprehensive.py:59
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `assert user.role.value == "customer"`
**Suggested Fix:** `assert user.role.value == Role.customer`
**Context:** Consider using Role.customer instead of string literal

### test_enum_defaults_comprehensive.py:83
**Severity:** warning
**Description:** Using string literal 'Active' instead of enum member
**Current Code:** `assert reservation.status.value == "Active"`
**Suggested Fix:** `assert reservation.status.value == ReservationStatus.active`
**Context:** Consider using ReservationStatus.active instead of string literal

### test_enum_defaults_comprehensive.py:102
**Severity:** warning
**Description:** Using string literal 'Processing' instead of enum member
**Current Code:** `assert fulfillment.status.value == "Processing"`
**Suggested Fix:** `assert fulfillment.status.value == FulfillmentStatus.processing`
**Context:** Consider using FulfillmentStatus.processing instead of string literal

### test_enum_defaults_comprehensive.py:121
**Severity:** warning
**Description:** Using string literal 'Dispatched' instead of enum member
**Current Code:** `assert shipment.status.value == "Dispatched"`
**Suggested Fix:** `assert shipment.status.value == ShipmentStatus.dispatched`
**Context:** Consider using ShipmentStatus.dispatched instead of string literal

### test_enum_defaults_comprehensive.py:140
**Severity:** warning
**Description:** Using string literal 'paystack' instead of enum member
**Current Code:** `assert refund.refund_method.value == "paystack"`
**Suggested Fix:** `assert refund.refund_method.value == RefundMethod.paystack`
**Context:** Consider using RefundMethod.paystack instead of string literal

### test_enum_defaults_comprehensive.py:197
**Severity:** warning
**Description:** Using string literal 'Paid' instead of enum member
**Current Code:** `assert order1.status.value == "Paid"`
**Suggested Fix:** `assert order1.status.value == OrderStatus.paid`
**Context:** Consider using OrderStatus.paid instead of string literal

### test_enum_defaults_comprehensive.py:204
**Severity:** warning
**Description:** Using string literal 'Cancelled' instead of enum member
**Current Code:** `assert order2.status.value == "Cancelled"`
**Suggested Fix:** `assert order2.status.value == OrderStatus.cancelled`
**Context:** Consider using OrderStatus.cancelled instead of string literal

### test_enum_defaults_comprehensive.py:222
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Suggested Fix:** `assert OrderStatus.pending_payment.value == OrderStatus.pending_payment`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### test_enum_defaults_comprehensive.py:223
**Severity:** warning
**Description:** Using string literal 'Paid' instead of enum member
**Current Code:** `assert OrderStatus.paid.value == "Paid"`
**Suggested Fix:** `assert OrderStatus.paid.value == OrderStatus.paid`
**Context:** Consider using OrderStatus.paid instead of string literal

### test_enum_defaults_comprehensive.py:224
**Severity:** warning
**Description:** Using string literal 'Cancelled' instead of enum member
**Current Code:** `assert OrderStatus.cancelled.value == "Cancelled"`
**Suggested Fix:** `assert OrderStatus.cancelled.value == OrderStatus.cancelled`
**Context:** Consider using OrderStatus.cancelled instead of string literal

### test_enum_defaults_comprehensive.py:225
**Severity:** warning
**Description:** Using string literal 'Refunded' instead of enum member
**Current Code:** `assert OrderStatus.refunded.value == "Refunded"`
**Suggested Fix:** `assert OrderStatus.refunded.value == OrderStatus.refunded`
**Context:** Consider using OrderStatus.refunded instead of string literal

### test_enum_defaults_comprehensive.py:228
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `assert Role.admin.value == "admin"`
**Suggested Fix:** `assert Role.admin.value == Role.admin`
**Context:** Consider using Role.admin instead of string literal

### test_enum_defaults_comprehensive.py:229
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `assert Role.supervisor.value == "supervisor"`
**Suggested Fix:** `assert Role.supervisor.value == Role.supervisor`
**Context:** Consider using Role.supervisor instead of string literal

### test_enum_defaults_comprehensive.py:230
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `assert Role.operations.value == "operations"`
**Suggested Fix:** `assert Role.operations.value == Role.operations`
**Context:** Consider using Role.operations instead of string literal

### test_enum_defaults_comprehensive.py:231
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `assert Role.logistics.value == "logistics"`
**Suggested Fix:** `assert Role.logistics.value == Role.logistics`
**Context:** Consider using Role.logistics instead of string literal

### test_enum_defaults_comprehensive.py:232
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `assert Role.customer.value == "customer"`
**Suggested Fix:** `assert Role.customer.value == Role.customer`
**Context:** Consider using Role.customer instead of string literal

### test_enum_defaults_comprehensive.py:235
**Severity:** warning
**Description:** Using string literal 'Active' instead of enum member
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Suggested Fix:** `assert ReservationStatus.active.value == ReservationStatus.active`
**Context:** Consider using ReservationStatus.active instead of string literal

### test_enum_defaults_comprehensive.py:236
**Severity:** warning
**Description:** Using string literal 'Released' instead of enum member
**Current Code:** `assert ReservationStatus.released.value == "Released"`
**Suggested Fix:** `assert ReservationStatus.released.value == ReservationStatus.released`
**Context:** Consider using ReservationStatus.released instead of string literal

### test_enum_defaults_comprehensive.py:237
**Severity:** warning
**Description:** Using string literal 'Consumed' instead of enum member
**Current Code:** `assert ReservationStatus.consumed.value == "Consumed"`
**Suggested Fix:** `assert ReservationStatus.consumed.value == ReservationStatus.consumed`
**Context:** Consider using ReservationStatus.consumed instead of string literal

### test_enum_defaults_comprehensive.py:238
**Severity:** warning
**Description:** Using string literal 'Expired' instead of enum member
**Current Code:** `assert ReservationStatus.expired.value == "Expired"`
**Suggested Fix:** `assert ReservationStatus.expired.value == ReservationStatus.expired`
**Context:** Consider using ReservationStatus.expired instead of string literal

### test_enum_defaults_comprehensive.py:241
**Severity:** warning
**Description:** Using string literal 'Processing' instead of enum member
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Suggested Fix:** `assert FulfillmentStatus.processing.value == FulfillmentStatus.processing`
**Context:** Consider using FulfillmentStatus.processing instead of string literal

### test_enum_defaults_comprehensive.py:242
**Severity:** warning
**Description:** Using string literal 'ReadyToShip' instead of enum member
**Current Code:** `assert FulfillmentStatus.ready_to_ship.value == "ReadyToShip"`
**Suggested Fix:** `assert FulfillmentStatus.ready_to_ship.value == FulfillmentStatus.ready_to_ship`
**Context:** Consider using FulfillmentStatus.ready_to_ship instead of string literal

### test_enum_defaults_comprehensive.py:245
**Severity:** warning
**Description:** Using string literal 'Dispatched' instead of enum member
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Suggested Fix:** `assert ShipmentStatus.dispatched.value == ShipmentStatus.dispatched`
**Context:** Consider using ShipmentStatus.dispatched instead of string literal

### test_enum_defaults_comprehensive.py:246
**Severity:** warning
**Description:** Using string literal 'InTransit' instead of enum member
**Current Code:** `assert ShipmentStatus.in_transit.value == "InTransit"`
**Suggested Fix:** `assert ShipmentStatus.in_transit.value == ShipmentStatus.in_transit`
**Context:** Consider using ShipmentStatus.in_transit instead of string literal

### test_enum_defaults_comprehensive.py:247
**Severity:** warning
**Description:** Using string literal 'Delivered' instead of enum member
**Current Code:** `assert ShipmentStatus.delivered.value == "Delivered"`
**Suggested Fix:** `assert ShipmentStatus.delivered.value == ShipmentStatus.delivered`
**Context:** Consider using ShipmentStatus.delivered instead of string literal

### test_enum_defaults_comprehensive.py:248
**Severity:** warning
**Description:** Using string literal 'Returned' instead of enum member
**Current Code:** `assert ShipmentStatus.returned.value == "Returned"`
**Suggested Fix:** `assert ShipmentStatus.returned.value == ShipmentStatus.returned`
**Context:** Consider using ShipmentStatus.returned instead of string literal

### test_enum_defaults_comprehensive.py:251
**Severity:** warning
**Description:** Using string literal 'paystack' instead of enum member
**Current Code:** `assert RefundMethod.paystack.value == "paystack"`
**Suggested Fix:** `assert RefundMethod.paystack.value == RefundMethod.paystack`
**Context:** Consider using RefundMethod.paystack instead of string literal

### test_enum_defaults_comprehensive.py:252
**Severity:** warning
**Description:** Using string literal 'manual' instead of enum member
**Current Code:** `assert RefundMethod.manual.value == "manual"`
**Suggested Fix:** `assert RefundMethod.manual.value == RefundMethod.manual`
**Context:** Consider using RefundMethod.manual instead of string literal

### test_enum_database_validation.py:250
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `assert order.status == "PendingPayment"  # Verify it matches database enum value`
**Suggested Fix:** `assert order.status == OrderStatus.pending_payment  # Verify it matches database enum value`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### test_enum_database_validation.py:257
**Severity:** warning
**Description:** Using string literal 'Active' instead of enum member
**Current Code:** `assert reservation.status == "Active"`
**Suggested Fix:** `assert reservation.status == ReservationStatus.active`
**Context:** Consider using ReservationStatus.active instead of string literal

### test_enum_database_validation.py:264
**Severity:** warning
**Description:** Using string literal 'Processing' instead of enum member
**Current Code:** `assert fulfillment.status == "Processing"`
**Suggested Fix:** `assert fulfillment.status == FulfillmentStatus.processing`
**Context:** Consider using FulfillmentStatus.processing instead of string literal

### test_enum_database_validation.py:271
**Severity:** warning
**Description:** Using string literal 'Dispatched' instead of enum member
**Current Code:** `assert shipment.status == "Dispatched"`
**Suggested Fix:** `assert shipment.status == ShipmentStatus.dispatched`
**Context:** Consider using ShipmentStatus.dispatched instead of string literal

### test_enum_database_validation.py:298
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `assert order.status == "PendingPayment"`
**Suggested Fix:** `assert order.status == OrderStatus.pending_payment`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### test_enum_database_validation.py:303
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `assert retrieved_order.status == "PendingPayment"`
**Suggested Fix:** `assert retrieved_order.status == OrderStatus.pending_payment`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### reviews.py:391
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `if review.user_id != user_id and claims.get("role") != "admin":`
**Suggested Fix:** `if review.user_id != user_id and claims.get("role") != Role.admin:`
**Context:** Consider using Role.admin instead of string literal

### admin_users.py:255
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `if actor_role == "supervisor" and request.role in [Role.admin, Role.supervisor]:`
**Suggested Fix:** `if actor_role == Role.supervisor and request.role in [Role.admin, Role.supervisor]:`
**Context:** Consider using Role.supervisor instead of string literal

### admin_users.py:501
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `if actor_role == "supervisor":`
**Suggested Fix:** `if actor_role == Role.supervisor:`
**Context:** Consider using Role.supervisor instead of string literal

### admin_users.py:601
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `if actor_role == "supervisor" and user.role in [Role.admin, Role.supervisor]:`
**Suggested Fix:** `if actor_role == Role.supervisor and user.role in [Role.admin, Role.supervisor]:`
**Context:** Consider using Role.supervisor instead of string literal

### admin_users.py:729
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `if actor_role == "supervisor" and user.role in [Role.admin, Role.supervisor]:`
**Suggested Fix:** `if actor_role == Role.supervisor and user.role in [Role.admin, Role.supervisor]:`
**Context:** Consider using Role.supervisor instead of string literal

### admin.py:66
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `if user_role == "operations":`
**Suggested Fix:** `if user_role == Role.operations:`
**Context:** Consider using Role.operations instead of string literal

### admin.py:71
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `elif user_role == "logistics":`
**Suggested Fix:** `elif user_role == Role.logistics:`
**Context:** Consider using Role.logistics instead of string literal

### admin.py:462
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `if user_role == "admin":`
**Suggested Fix:** `if user_role == Role.admin:`
**Context:** Consider using Role.admin instead of string literal

### admin.py:1228
**Severity:** warning
**Description:** Using string literal 'Delivered' instead of enum member
**Current Code:** `ShipmentEvent.code == "Delivered"`
**Suggested Fix:** `ShipmentEvent.code == ShipmentStatus.delivered`
**Context:** Consider using ShipmentStatus.delivered instead of string literal

### middleware.ts:50
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `if (pathname.startsWith('/admin') && role === 'customer') {`
**Suggested Fix:** `if (pathname.startsWith('/admin') && role === Role.customer) {`
**Context:** Consider using Role.customer instead of string literal

### status-mapper.ts:115
**Severity:** warning
**Description:** Using string literal 'Delivered' instead of enum member
**Current Code:** `else if (shipment?.status === 'Delivered') {`
**Suggested Fix:** `else if (shipment?.status === ShipmentStatus.delivered) {`
**Context:** Consider using ShipmentStatus.delivered instead of string literal

### status-mapper.ts:119
**Severity:** warning
**Description:** Using string literal 'InTransit' instead of enum member
**Current Code:** `} else if (shipment?.status === 'InTransit') {`
**Suggested Fix:** `} else if (shipment?.status === ShipmentStatus.in_transit) {`
**Context:** Consider using ShipmentStatus.in_transit instead of string literal

### status-mapper.ts:123
**Severity:** warning
**Description:** Using string literal 'Dispatched' instead of enum member
**Current Code:** `} else if (shipment?.status === 'Dispatched') {`
**Suggested Fix:** `} else if (shipment?.status === ShipmentStatus.dispatched) {`
**Context:** Consider using ShipmentStatus.dispatched instead of string literal

### status-mapper.ts:133
**Severity:** warning
**Description:** Using string literal 'ReadyToShip' instead of enum member
**Current Code:** `if (fulfillment?.status === 'ReadyToShip') {`
**Suggested Fix:** `if (fulfillment?.status === FulfillmentStatus.ready_to_ship) {`
**Context:** Consider using FulfillmentStatus.ready_to_ship instead of string literal

### status-mapper.ts:155
**Severity:** warning
**Description:** Using string literal 'Processing' instead of enum member
**Current Code:** `else if (fulfillment?.status === 'Processing') {`
**Suggested Fix:** `else if (fulfillment?.status === FulfillmentStatus.processing) {`
**Context:** Consider using FulfillmentStatus.processing instead of string literal

### status-mapper.ts:178
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `confidence = context === 'admin' ? 'medium' : 'high' // Lower confidence for admin (they need accurate data)`
**Suggested Fix:** `confidence = context === Role.admin ? 'medium' : 'high' // Lower confidence for admin (they need accurate data)`
**Context:** Consider using Role.admin instead of string literal

### status-mapper.ts:182
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `confidence = context === 'admin' ? 'medium' : 'high'`
**Suggested Fix:** `confidence = context === Role.admin ? 'medium' : 'high'`
**Context:** Consider using Role.admin instead of string literal

### status-mapper.ts:188
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `confidence = context === 'admin' ? 'medium' : 'high' // Improve confidence for expected fallback case`
**Suggested Fix:** `confidence = context === Role.admin ? 'medium' : 'high' // Improve confidence for expected fallback case`
**Context:** Consider using Role.admin instead of string literal

### AdminRouteGuard.tsx:61
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `if (userData.role !== 'admin') {`
**Suggested Fix:** `if (userData.role !== Role.admin) {`
**Context:** Consider using Role.admin instead of string literal

### AdminRouteGuard.tsx:139
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `if (user && user.role === 'admin') {`
**Suggested Fix:** `if (user && user.role === Role.admin) {`
**Context:** Consider using Role.admin instead of string literal

### page.tsx:327
**Severity:** warning
**Description:** Using string literal 'Paid' instead of enum member
**Current Code:** `order.status === 'Paid'`
**Suggested Fix:** `order.status === OrderStatus.paid`
**Context:** Consider using OrderStatus.paid instead of string literal

### page.tsx:329
**Severity:** warning
**Description:** Using string literal 'PendingPayment' instead of enum member
**Current Code:** `: order.status === 'PendingPayment'`
**Suggested Fix:** `: order.status === OrderStatus.pending_payment`
**Context:** Consider using OrderStatus.pending_payment instead of string literal

### page.tsx:331
**Severity:** warning
**Description:** Using string literal 'Cancelled' instead of enum member
**Current Code:** `: order.status === 'Cancelled'`
**Suggested Fix:** `: order.status === OrderStatus.cancelled`
**Context:** Consider using OrderStatus.cancelled instead of string literal

### page.tsx:70
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `const redirectUrl = data.role === "customer" ? "/account" : "/admin"`
**Suggested Fix:** `const redirectUrl = data.role === Role.customer ? "/account" : "/admin"`
**Context:** Consider using Role.customer instead of string literal

### page.tsx:85
**Severity:** warning
**Description:** Using string literal 'Paid' instead of enum member
**Current Code:** `if (data.status === "Paid") {`
**Suggested Fix:** `if (data.status === OrderStatus.paid) {`
**Context:** Consider using OrderStatus.paid instead of string literal

### page.tsx:189
**Severity:** warning
**Description:** Using string literal 'Paid' instead of enum member
**Current Code:** `setMessage(data.status === "Paid" ? "Payment confirmed. Thank you!" : "Still pending. Please wait.");`
**Suggested Fix:** `setMessage(data.status === OrderStatus.paid ? "Payment confirmed. Thank you!" : "Still pending. Please wait.");`
**Context:** Consider using OrderStatus.paid instead of string literal

### page.tsx:191
**Severity:** warning
**Description:** Using string literal 'Paid' instead of enum member
**Current Code:** `if (data.status === "Paid") {`
**Suggested Fix:** `if (data.status === OrderStatus.paid) {`
**Context:** Consider using OrderStatus.paid instead of string literal

### page.tsx:285
**Severity:** warning
**Description:** Using string literal 'Paid' instead of enum member
**Current Code:** `if (status !== "Paid" && !showReceipt) {`
**Suggested Fix:** `if (status !== OrderStatus.paid && !showReceipt) {`
**Context:** Consider using OrderStatus.paid instead of string literal

### page.tsx:242
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `{user?.role === 'logistics' && (`
**Suggested Fix:** `{user?.role === Role.logistics && (`
**Context:** Consider using Role.logistics instead of string literal

### page.tsx:685
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `{user?.role === 'operations'`
**Suggested Fix:** `{user?.role === Role.operations`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:149
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `const canManageSupervisors = currentUser?.role === 'admin' // Only admins can manage supervisors`
**Suggested Fix:** `const canManageSupervisors = currentUser?.role === Role.admin // Only admins can manage supervisors`
**Context:** Consider using Role.admin instead of string literal

### page.tsx:150
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `const isCurrentUserSupervisor = currentUser?.role === 'supervisor'`
**Suggested Fix:** `const isCurrentUserSupervisor = currentUser?.role === Role.supervisor`
**Context:** Consider using Role.supervisor instead of string literal

### page.tsx:179
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `if (user.role === 'customer') {`
**Suggested Fix:** `if (user.role === Role.customer) {`
**Context:** Consider using Role.customer instead of string literal

### page.tsx:183
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `return user.role === 'operations' && user.has_password === true`
**Suggested Fix:** `return user.role === Role.operations && user.has_password === true`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:192
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `return user.role === 'operations' && user.has_password === false`
**Suggested Fix:** `return user.role === Role.operations && user.has_password === false`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:199
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `if (activeSection === 'customer') {`
**Suggested Fix:** `if (activeSection === Role.customer) {`
**Context:** Consider using Role.customer instead of string literal

### page.tsx:517
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `{activeSection === 'customer'`
**Suggested Fix:** `{activeSection === Role.customer`
**Context:** Consider using Role.customer instead of string literal

### page.tsx:523
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `{currentUser?.role === 'supervisor' && (`
**Suggested Fix:** `{currentUser?.role === Role.supervisor && (`
**Context:** Consider using Role.supervisor instead of string literal

### page.tsx:556
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `{currentUser?.role === 'supervisor' && (`
**Suggested Fix:** `{currentUser?.role === Role.supervisor && (`
**Context:** Consider using Role.supervisor instead of string literal

### page.tsx:639
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `activeSection === 'customer'`
**Suggested Fix:** `activeSection === Role.customer`
**Context:** Consider using Role.customer instead of string literal

### page.tsx:688
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `activeStaffTab === 'admin'`
**Suggested Fix:** `activeStaffTab === Role.admin`
**Context:** Consider using Role.admin instead of string literal

### page.tsx:695
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `Admin ({users.filter(u => u.role === 'admin').length})`
**Suggested Fix:** `Admin ({users.filter(u => u.role === Role.admin).length})`
**Context:** Consider using Role.admin instead of string literal

### page.tsx:701
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `activeStaffTab === 'supervisor'`
**Suggested Fix:** `activeStaffTab === Role.supervisor`
**Context:** Consider using Role.supervisor instead of string literal

### page.tsx:708
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `Supervisor ({users.filter(u => u.role === 'supervisor').length})`
**Suggested Fix:** `Supervisor ({users.filter(u => u.role === Role.supervisor).length})`
**Context:** Consider using Role.supervisor instead of string literal

### page.tsx:714
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `activeStaffTab === 'operations'`
**Suggested Fix:** `activeStaffTab === Role.operations`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:721
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `Operations ({users.filter(u => u.role === 'operations').length})`
**Suggested Fix:** `Operations ({users.filter(u => u.role === Role.operations).length})`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:727
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `activeStaffTab === 'logistics'`
**Suggested Fix:** `activeStaffTab === Role.logistics`
**Context:** Consider using Role.logistics instead of string literal

### page.tsx:734
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `Logistics ({users.filter(u => u.role === 'logistics').length})`
**Suggested Fix:** `Logistics ({users.filter(u => u.role === Role.logistics).length})`
**Context:** Consider using Role.logistics instead of string literal

### page.tsx:806
**Severity:** warning
**Description:** Using string literal 'customer' instead of enum member
**Current Code:** `{activeSection === 'customer'`
**Suggested Fix:** `{activeSection === Role.customer`
**Context:** Consider using Role.customer instead of string literal

### page.tsx:1032
**Severity:** warning
**Description:** Using string literal 'supervisor' instead of enum member
**Current Code:** `{user?.role === 'supervisor'`
**Suggested Fix:** `{user?.role === Role.supervisor`
**Context:** Consider using Role.supervisor instead of string literal

### page.tsx:1034
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `: user?.role === 'operations' || user?.role === 'logistics'`
**Suggested Fix:** `: user?.role === Role.operations || user?.role === 'logistics'`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:1034
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `: user?.role === 'operations' || user?.role === 'logistics'`
**Suggested Fix:** `: user?.role === 'operations' || user?.role === Role.logistics`
**Context:** Consider using Role.logistics instead of string literal

### page.tsx:854
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `{user?.role === 'operations'`
**Suggested Fix:** `{user?.role === Role.operations`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:856
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `: user?.role === 'logistics'`
**Suggested Fix:** `: user?.role === Role.logistics`
**Context:** Consider using Role.logistics instead of string literal

### page.tsx:673
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `{user?.role === 'logistics' && (`
**Suggested Fix:** `{user?.role === Role.logistics && (`
**Context:** Consider using Role.logistics instead of string literal

### page.tsx:304
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `{user?.role === 'operations' && (`
**Suggested Fix:** `{user?.role === Role.operations && (`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:315
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `{user?.role === 'logistics' && (`
**Suggested Fix:** `{user?.role === Role.logistics && (`
**Context:** Consider using Role.logistics instead of string literal

### page.tsx:1003
**Severity:** warning
**Description:** Using string literal 'operations' instead of enum member
**Current Code:** `{user?.role === 'operations'`
**Suggested Fix:** `{user?.role === Role.operations`
**Context:** Consider using Role.operations instead of string literal

### page.tsx:1005
**Severity:** warning
**Description:** Using string literal 'logistics' instead of enum member
**Current Code:** `: user?.role === 'logistics'`
**Suggested Fix:** `: user?.role === Role.logistics`
**Context:** Consider using Role.logistics instead of string literal

### page.tsx:208
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `const canModifyPaymentStatus = user && user.role === 'admin' && !order.payment_ref?.trim()`
**Suggested Fix:** `const canModifyPaymentStatus = user && user.role === Role.admin && !order.payment_ref?.trim()`
**Context:** Consider using Role.admin instead of string literal

### page.tsx:218
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `isAdmin: user?.role === 'admin',`
**Suggested Fix:** `isAdmin: user?.role === Role.admin,`
**Context:** Consider using Role.admin instead of string literal

### page.tsx:258
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `const canModifyPaymentStatus = user && user.role === 'admin' && !order.payment_ref?.trim()`
**Suggested Fix:** `const canModifyPaymentStatus = user && user.role === Role.admin && !order.payment_ref?.trim()`
**Context:** Consider using Role.admin instead of string literal

### page.tsx:750
**Severity:** warning
**Description:** Using string literal 'admin' instead of enum member
**Current Code:** `{user && user.role === 'admin' && !order.payment_ref?.trim() ? (`
**Suggested Fix:** `{user && user.role === Role.admin && !order.payment_ref?.trim() ? (`
**Context:** Consider using Role.admin instead of string literal

## Enum Value Access (57 issues)

### test_enum_values.py:20
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.pending_payment.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:21
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.paid.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:22
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.cancelled.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:23
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.refunded.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:30
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `FulfillmentStatus.processing.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:31
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `FulfillmentStatus.ready_to_ship.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:38
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.dispatched.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:39
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.in_transit.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:40
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.delivered.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:41
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.returned.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:48
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.active.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:49
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.released.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:50
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.consumed.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:51
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.expired.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:58
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `RefundMethod.paystack.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:59
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `RefundMethod.manual.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:66
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.admin.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:67
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.supervisor.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:68
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.operations.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:69
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.logistics.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:77
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.pending_payment.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:80
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `FulfillmentStatus.processing.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:83
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.dispatched.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_values.py:86
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.active.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:222
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.pending_payment.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:223
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.paid.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:224
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.cancelled.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:225
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.refunded.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:228
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.admin.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:229
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.supervisor.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:230
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.operations.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:231
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.logistics.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:232
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.customer.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:235
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.active.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:236
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.released.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:237
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.consumed.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:238
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.expired.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:241
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `FulfillmentStatus.processing.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:242
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `FulfillmentStatus.ready_to_ship.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:245
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.dispatched.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:246
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.in_transit.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:247
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.delivered.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:248
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.returned.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:251
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `RefundMethod.paystack.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_defaults_comprehensive.py:252
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `RefundMethod.manual.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_database_validation.py:217
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.paid.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_database_validation.py:223
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.paid.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_database_validation.py:236
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.pending_payment.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_database_validation.py:249
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.pending_payment.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_database_validation.py:256
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.active.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_database_validation.py:263
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `FulfillmentStatus.processing.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_database_validation.py:270
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ShipmentStatus.dispatched.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### test_enum_database_validation.py:212
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `OrderStatus.pending_payment.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### worker.py:16
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.expired.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### worker.py:15
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `ReservationStatus.active.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### sessions.py:157
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.admin.value`
**Context:** Enum .value access should only be used for serialization or specific cases

### sessions.py:157
**Severity:** info
**Description:** Accessing enum .value - verify this is necessary
**Current Code:** `Role.supervisor.value`
**Context:** Enum .value access should only be used for serialization or specific cases

## Incorrect Enum Construction (32 issues)

### checkout-mock.spec.ts:17
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await expect(page.getByRole('heading', { name: /Your Cart/i })).toBeVisible()`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout-mock.spec.ts:21
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await page.getByRole('link', { name: /Proceed to Checkout/i }).click()`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout-mock.spec.ts:37
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await expect(page.getByRole('heading', { name: /Paystack Mock/i })).toBeVisible()`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout-mock.spec.ts:38
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await page.getByRole('button', { name: /Simulate Success/i }).click()`
**Context:** Enums should be accessed as members, not constructed with strings

### account-settings.spec.ts:15
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await page.getByRole('button', { name: /Sign in/i }).click()`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:36
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await page.getByRole('link', { name: /Proceed to Checkout/i }).click();`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:46
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await page.getByRole("button", { name: /Pay with Paystack/i }).click();`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:51
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await expect(page.getByRole('heading', { name: /Paystack Mock/i })).toBeVisible();`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:52
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await page.getByRole("button", { name: /Simulate Success/i }).click();`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:9
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await expect(page.getByRole('heading', { name: 'Maison De Valeur' })).toBeVisible();`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:21
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await expect(page.getByRole('heading')).toBeVisible();`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:23
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `const addToCart = page.getByRole('button', { name: /add to cart/i });`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:33
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await expect(page.getByRole('heading', { name: /Your Cart/i })).toBeVisible();`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:35
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `const proceed = page.getByRole('link', { name: /Proceed to Checkout/i });`
**Context:** Enums should be accessed as members, not constructed with strings

### checkout.spec.ts:40
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `await expect(page.getByRole('heading', { name: /Checkout/i })).toBeVisible();`
**Context:** Enums should be accessed as members, not constructed with strings

### auth-context.tsx:482
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `* const canAccessAdminFeatures = useRole('operations')`
**Context:** Enums should be accessed as members, not constructed with strings

### OrderHistory.tsx:302
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `setFilterStatus('all')`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:204
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('logistics') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:235
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('operations') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:246
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('logistics') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:385
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('logistics') ? (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:398
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `title={isRole('operations') ? 'Edit Product (Stock Only)' : 'Edit Product'}`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:406
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('operations') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:428
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('logistics') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:539
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('logistics') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:253
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('operations') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:264
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('logistics') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:505
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('logistics') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:565
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('operations') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:576
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `{isRole('logistics') && (`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:501
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `onClick={() => handleBulkUpdateStatus('delivered')}`
**Context:** Enums should be accessed as members, not constructed with strings

### page.tsx:509
**Severity:** error
**Description:** Incorrect enum construction with string argument
**Current Code:** `onClick={() => handleBulkUpdateStatus('returned')}`
**Context:** Enums should be accessed as members, not constructed with strings

## Database Query Issue (1 issues)

### worker.py:15
**Severity:** info
**Description:** Using .value in database query - verify this is correct
**Current Code:** `.where(and_(Reservation.status == ReservationStatus.active.value, Reservation.expires_at < now))`
**Context:** SQLAlchemy usually handles enum conversion automatically

## Test Enum Usage (51 issues)

### test_enum_values.py:20
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:21
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.paid.value == "Paid"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:22
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.cancelled.value == "Cancelled"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:23
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.refunded.value == "Refunded"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:30
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:31
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert FulfillmentStatus.ready_to_ship.value == "ReadyToShip"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:38
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:39
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.in_transit.value == "InTransit"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:40
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.delivered.value == "Delivered"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:41
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.returned.value == "Returned"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:48
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:49
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.released.value == "Released"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:50
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.consumed.value == "Consumed"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:51
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.expired.value == "Expired"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:58
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert RefundMethod.paystack.value == "paystack"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:59
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert RefundMethod.manual.value == "manual"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:66
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.admin.value == "admin"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:67
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.supervisor.value == "supervisor"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:68
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.operations.value == "operations"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:69
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.logistics.value == "logistics"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:77
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:80
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:83
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Context:** Tests may need to check both enum members and values

### test_enum_values.py:86
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:222
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.pending_payment.value == "PendingPayment"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:223
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.paid.value == "Paid"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:224
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.cancelled.value == "Cancelled"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:225
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert OrderStatus.refunded.value == "Refunded"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:228
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.admin.value == "admin"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:229
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.supervisor.value == "supervisor"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:230
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.operations.value == "operations"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:231
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.logistics.value == "logistics"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:232
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert Role.customer.value == "customer"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:235
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.active.value == "Active"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:236
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.released.value == "Released"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:237
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.consumed.value == "Consumed"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:238
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ReservationStatus.expired.value == "Expired"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:241
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert FulfillmentStatus.processing.value == "Processing"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:242
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert FulfillmentStatus.ready_to_ship.value == "ReadyToShip"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:245
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.dispatched.value == "Dispatched"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:246
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.in_transit.value == "InTransit"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:247
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.delivered.value == "Delivered"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:248
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert ShipmentStatus.returned.value == "Returned"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:251
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert RefundMethod.paystack.value == "paystack"`
**Context:** Tests may need to check both enum members and values

### test_enum_defaults_comprehensive.py:252
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert RefundMethod.manual.value == "manual"`
**Context:** Tests may need to check both enum members and values

### test_enum_database_validation.py:223
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert retrieved_order.status == OrderStatus.paid.value`
**Context:** Tests may need to check both enum members and values

### test_enum_database_validation.py:236
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert order.status == OrderStatus.pending_payment.value`
**Context:** Tests may need to check both enum members and values

### test_enum_database_validation.py:249
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert order.status == OrderStatus.pending_payment.value`
**Context:** Tests may need to check both enum members and values

### test_enum_database_validation.py:256
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert reservation.status == ReservationStatus.active.value`
**Context:** Tests may need to check both enum members and values

### test_enum_database_validation.py:263
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert fulfillment.status == FulfillmentStatus.processing.value`
**Context:** Tests may need to check both enum members and values

### test_enum_database_validation.py:270
**Severity:** info
**Description:** Using .value in test assertion - verify this is intentional
**Current Code:** `assert shipment.status == ShipmentStatus.dispatched.value`
**Context:** Tests may need to check both enum members and values
