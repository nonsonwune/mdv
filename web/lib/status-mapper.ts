/**
 * Centralized Order Status Mapping Utility
 * 
 * This module provides consistent status mapping logic across the application.
 * It handles the complex mapping between backend OrderStatus, FulfillmentStatus,
 * ShipmentStatus, and timeline events to determine the correct UI status.
 */

export type OrderUIStatus = 
  | 'pending' 
  | 'processing' 
  | 'pending_dispatch' 
  | 'in_transit' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled'

export type PaymentUIStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrderStatusData {
  id?: number
  status?: string
  fulfillment?: {
    status?: string
    packed_by?: number
    packed_at?: string
    notes?: string
    shipment?: {
      status?: string
      tracking_id?: string
      courier?: string
      dispatched_at?: string
    }
  }
  shipment?: {
    status?: string
    tracking_id?: string
    courier?: string
    dispatched_at?: string
  }
  tracking_timeline?: Array<{
    code?: string
    at?: string
    message?: string
    tracking_id?: string
  }>
}

export interface StatusMappingResult {
  uiStatus: OrderUIStatus
  paymentStatus: PaymentUIStatus
  confidence: 'high' | 'medium' | 'low'
  source: 'shipment' | 'fulfillment' | 'backend' | 'timeline' | 'fallback'
  debugInfo: {
    backendStatus: string
    fulfillmentStatus: string | null
    shipmentStatus: string | null
    hasDelivered: boolean
    hasShipped: boolean
    timelineEvents: number
  }
}

/**
 * Maps order data to UI status with comprehensive null safety and logging
 */
export function mapOrderStatus(
  orderData: OrderStatusData,
  context: 'admin' | 'customer' = 'admin',
  enableLogging: boolean = true
): StatusMappingResult {
  // Null-safe data extraction
  const backendStatus = String(orderData?.status || '').toLowerCase()
  const timeline = Array.isArray(orderData?.tracking_timeline) ? orderData.tracking_timeline : []
  const fulfillment = orderData?.fulfillment || null
  const shipment = orderData?.shipment || fulfillment?.shipment || null

  // Timeline analysis with null safety
  const hasDelivered = timeline.some(e => 
    e && typeof e.code === 'string' && e.code.toLowerCase() === 'delivered'
  )
  const hasShipped = hasDelivered || timeline.some(e => 
    e && typeof e.code === 'string' && 
    ['shipped', 'dispatched'].includes(e.code.toLowerCase())
  )

  // Debug information
  const debugInfo = {
    backendStatus,
    fulfillmentStatus: fulfillment?.status || null,
    shipmentStatus: shipment?.status || null,
    hasDelivered,
    hasShipped,
    timelineEvents: timeline.length
  }

  let uiStatus: OrderUIStatus = 'pending'
  let confidence: 'high' | 'medium' | 'low' = 'high'
  let source: StatusMappingResult['source'] = 'backend'

  // Status mapping logic with priority order
  if ((shipment?.status === 'Delivered') || hasDelivered) {
    uiStatus = 'delivered'
    source = shipment?.status === 'Delivered' ? 'shipment' : 'timeline'
    confidence = 'high'
  } else if (shipment?.status === 'InTransit') {
    uiStatus = 'in_transit'
    source = 'shipment'
    confidence = 'high'
  } else if (shipment?.status === 'Dispatched' || hasShipped) {
    uiStatus = 'shipped'
    source = shipment?.status === 'Dispatched' ? 'shipment' : 'timeline'
    confidence = shipment?.status === 'Dispatched' ? 'high' : 'medium'
  } else if (backendStatus === 'cancelled') {
    uiStatus = 'cancelled'
    source = 'backend'
    confidence = 'high'
  } else if (backendStatus === 'refunded') {
    uiStatus = 'cancelled' // Show refunded as cancelled (terminal state)
    source = 'backend'
    confidence = 'high'
  } else if (backendStatus === 'paid') {
    // For paid orders, use fulfillment status to determine processing stage
    if (fulfillment?.status === 'ReadyToShip') {
      uiStatus = 'pending_dispatch'
      source = 'fulfillment'
      confidence = 'high'
    } else if (fulfillment?.status === 'Processing') {
      uiStatus = 'processing'
      source = 'fulfillment'
      confidence = 'high'
    } else {
      // Fallback for paid orders without clear fulfillment status
      uiStatus = 'processing'
      source = 'fallback'
      confidence = 'low'
    }
  } else if (backendStatus === 'pendingpayment') {
    uiStatus = 'pending'
    source = 'backend'
    confidence = 'high'
  } else {
    // Ultimate fallback
    uiStatus = 'pending'
    source = 'fallback'
    confidence = 'low'
  }

  // Derive payment status
  let paymentStatus: PaymentUIStatus = 'pending'
  if (backendStatus === 'paid') paymentStatus = 'paid'
  else if (backendStatus === 'refunded') paymentStatus = 'refunded'
  else if (backendStatus === 'cancelled') paymentStatus = 'pending'

  const result: StatusMappingResult = {
    uiStatus,
    paymentStatus,
    confidence,
    source,
    debugInfo
  }

  // Comprehensive logging
  if (enableLogging) {
    const logLevel = confidence === 'low' ? 'warn' : 'log'
    console[logLevel](`🔍 Order Status Mapping [${context}]:`, {
      orderId: orderData?.id,
      result: {
        uiStatus,
        paymentStatus,
        confidence,
        source
      },
      debugInfo
    })

    if (confidence === 'low') {
      console.warn('⚠️ Low confidence status mapping - review data quality')
    }
  }

  return result
}

/**
 * Get status color class for UI display
 */
export function getStatusColor(status: OrderUIStatus): string {
  const colorMap: Record<OrderUIStatus, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'pending_dispatch': 'bg-orange-100 text-orange-800',
    'in_transit': 'bg-indigo-100 text-indigo-800',
    'shipped': 'bg-purple-100 text-purple-800',
    'delivered': 'bg-green-100 text-green-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get payment status color class for UI display
 */
export function getPaymentStatusColor(status: PaymentUIStatus): string {
  const colorMap: Record<PaymentUIStatus, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'paid': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'refunded': 'bg-gray-100 text-gray-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Format status for display (capitalize and replace underscores)
 */
export function formatStatusDisplay(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Validate if a status transition is allowed
 */
export function isValidStatusTransition(
  from: OrderUIStatus, 
  to: OrderUIStatus
): boolean {
  const validTransitions: Record<OrderUIStatus, OrderUIStatus[]> = {
    'pending': ['processing', 'cancelled'],
    'processing': ['pending_dispatch', 'cancelled'],
    'pending_dispatch': ['shipped', 'in_transit', 'cancelled'],
    'in_transit': ['delivered', 'shipped'],
    'shipped': ['delivered', 'in_transit'],
    'delivered': [], // Terminal state
    'cancelled': [] // Terminal state
  }

  return validTransitions[from]?.includes(to) || false
}
