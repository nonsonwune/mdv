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

  // HYBRID STATUS RESOLUTION: Intelligently combine timeline events + admin intent

  // 1. TERMINAL STATES (always trust backend)
  if (backendStatus === 'cancelled') {
    uiStatus = 'cancelled'
    source = 'backend'
    confidence = 'high'
  } else if (backendStatus === 'refunded') {
    uiStatus = 'cancelled' // Show refunded as cancelled (terminal state)
    source = 'backend'
    confidence = 'high'
  }

  // 2. CONFIRMED LOGISTICS STATES (trust shipment data when available)
  else if (shipment?.status === 'Delivered') {
    uiStatus = 'delivered'
    source = 'shipment'
    confidence = 'high'
  } else if (shipment?.status === 'InTransit') {
    uiStatus = 'in_transit'
    source = 'shipment'
    confidence = 'high'
  } else if (shipment?.status === 'Dispatched') {
    uiStatus = 'shipped'
    source = 'shipment'
    confidence = 'high'
  }

  // 3. HYBRID RESOLUTION FOR PAID ORDERS (combine fulfillment + timeline intelligently)
  else if (backendStatus === 'paid') {
    // Strategy: Use fulfillment status as primary, timeline as validation/fallback

    if (fulfillment?.status === 'ReadyToShip') {
      // Admin set to pending_dispatch - check if timeline conflicts
      if (hasDelivered) {
        // Timeline shows delivered but fulfillment says ready to ship
        // This suggests timeline is more current (package was delivered)
        uiStatus = 'delivered'
        source = 'timeline'
        confidence = 'medium' // Medium because of data conflict
      } else if (hasShipped) {
        // Timeline shows shipped but fulfillment says ready to ship
        // This suggests package was actually dispatched
        uiStatus = 'shipped'
        source = 'timeline'
        confidence = 'medium' // Medium because of data conflict
      } else {
        // No timeline conflicts - trust fulfillment status
        uiStatus = 'pending_dispatch'
        source = 'fulfillment'
        confidence = 'high'
      }
    }

    else if (fulfillment?.status === 'Processing') {
      // Admin set to processing - check if timeline suggests progression
      if (hasDelivered) {
        uiStatus = 'delivered'
        source = 'timeline'
        confidence = 'medium'
      } else if (hasShipped) {
        uiStatus = 'shipped'
        source = 'timeline'
        confidence = 'medium'
      } else {
        // No timeline conflicts - trust fulfillment status
        uiStatus = 'processing'
        source = 'fulfillment'
        confidence = 'high'
      }
    }

    else {
      // No fulfillment data - rely on timeline with confidence scoring
      if (hasDelivered) {
        uiStatus = 'delivered'
        source = 'timeline'
        confidence = context === 'admin' ? 'medium' : 'high' // Lower confidence for admin (they need accurate data)
      } else if (hasShipped) {
        uiStatus = 'shipped'
        source = 'timeline'
        confidence = context === 'admin' ? 'medium' : 'high'
      } else {
        // No fulfillment, no timeline - default to processing for paid orders
        // This is expected for older orders or during data migration
        uiStatus = 'processing'
        source = 'fallback'
        confidence = context === 'admin' ? 'medium' : 'high' // Improve confidence for expected fallback case
      }
    }
  }

  // 4. UNPAID ORDERS
  else if (backendStatus === 'pendingpayment') {
    uiStatus = 'pending'
    source = 'backend'
    confidence = 'high'
  }

  // 5. ULTIMATE FALLBACK
  else {
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

  // Comprehensive logging with hybrid decision explanation
  if (enableLogging) {
    const logLevel = confidence === 'low' ? 'warn' : 'log'

    // Determine decision rationale
    let decisionRationale = ''
    if (source === 'shipment') {
      decisionRationale = 'Shipment data available - using confirmed logistics status'
    } else if (source === 'fulfillment') {
      decisionRationale = 'Fulfillment status matches admin intent - no timeline conflicts'
    } else if (source === 'timeline') {
      decisionRationale = confidence === 'medium'
        ? 'Timeline events override fulfillment status (data conflict detected)'
        : 'Timeline events used as primary source (no fulfillment data)'
    } else if (source === 'backend') {
      decisionRationale = 'Backend status used for terminal states'
    } else {
      decisionRationale = confidence === 'low'
        ? 'Fallback logic applied - insufficient data quality'
        : 'Fallback logic applied - using default processing status for paid order'
    }

    console[logLevel](`🔍 Hybrid Order Status Resolution [${context}]:`, {
      orderId: orderData?.id,
      decision: {
        uiStatus,
        paymentStatus,
        confidence,
        source,
        rationale: decisionRationale
      },
      dataQuality: {
        hasFulfillment: !!fulfillment?.status,
        hasShipment: !!shipment?.status,
        timelineEvents: debugInfo.timelineEvents,
        hasConflicts: (fulfillment?.status && (hasDelivered || hasShipped))
      },
      debugInfo
    })

    if (confidence === 'low') {
      console.warn('⚠️ Low confidence hybrid mapping - review data quality and consider manual verification')
    } else if (confidence === 'medium') {
      console.info('ℹ️ Medium confidence mapping - data conflicts detected, timeline took precedence')
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
  // Same status is always allowed (no-op)
  if (from === to) return true

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

/**
 * Get allowed next statuses for a given status
 */
export function getAllowedNextStatuses(currentStatus: OrderUIStatus): OrderUIStatus[] {
  const validTransitions: Record<OrderUIStatus, OrderUIStatus[]> = {
    'pending': ['processing', 'cancelled'],
    'processing': ['pending_dispatch', 'cancelled'],
    'pending_dispatch': ['shipped', 'in_transit', 'cancelled'],
    'in_transit': ['delivered', 'shipped'],
    'shipped': ['delivered', 'in_transit'],
    'delivered': [], // Terminal state
    'cancelled': [] // Terminal state
  }

  return validTransitions[currentStatus] || []
}
