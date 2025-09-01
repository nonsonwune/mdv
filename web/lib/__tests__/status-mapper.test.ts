/**
 * Comprehensive Edge Case Tests for Order Status Mapping
 * 
 * This test suite validates the status mapping utility against all identified
 * edge cases from the cross-functional team review.
 */

import { mapOrderStatus, type OrderStatusData } from '../status-mapper'

describe('Order Status Mapper - Edge Cases', () => {
  
  describe('Null Safety Tests', () => {
    test('handles completely null order data', () => {
      const result = mapOrderStatus({}, 'admin', false)
      
      expect(result.uiStatus).toBe('pending')
      expect(result.confidence).toBe('low')
      expect(result.source).toBe('fallback')
      expect(result.debugInfo.fulfillmentStatus).toBeNull()
      expect(result.debugInfo.shipmentStatus).toBeNull()
    })

    test('handles order with null fulfillment', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        fulfillment: null,
        tracking_timeline: []
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.uiStatus).toBe('processing')
      expect(result.confidence).toBe('low')
      expect(result.source).toBe('fallback')
    })

    test('handles order with fulfillment but null shipment', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        fulfillment: {
          status: 'Processing',
          shipment: null
        },
        tracking_timeline: []
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.uiStatus).toBe('processing')
      expect(result.confidence).toBe('high')
      expect(result.source).toBe('fulfillment')
    })

    test('handles malformed timeline events', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        tracking_timeline: [
          null as any,
          { code: null } as any,
          { code: 'shipped' },
          undefined as any,
          { code: 123 } as any // Invalid type
        ]
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.debugInfo.hasShipped).toBe(true)
      expect(result.debugInfo.timelineEvents).toBe(5)
    })
  })

  describe('Conflicting Status Indicators', () => {
    test('prioritizes shipment status over timeline events', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        shipment: {
          status: 'Delivered'
        },
        tracking_timeline: [
          { code: 'shipped', at: '2024-01-01' }
        ]
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.uiStatus).toBe('delivered')
      expect(result.source).toBe('shipment')
      expect(result.confidence).toBe('high')
    })

    test('handles conflicting fulfillment and timeline data', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        fulfillment: {
          status: 'Processing'
        },
        tracking_timeline: [
          { code: 'dispatched', at: '2024-01-01' }
        ]
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      // Should prioritize timeline for shipped status over fulfillment
      expect(result.uiStatus).toBe('shipped')
      expect(result.source).toBe('timeline')
    })

    test('handles backend status vs fulfillment status mismatch', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'cancelled',
        fulfillment: {
          status: 'ReadyToShip'
        }
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      // Backend status should take priority for terminal states
      expect(result.uiStatus).toBe('cancelled')
      expect(result.source).toBe('backend')
    })
  })

  describe('Status Transition Edge Cases', () => {
    test('handles pending_dispatch correctly', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        fulfillment: {
          status: 'ReadyToShip'
        }
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.uiStatus).toBe('pending_dispatch')
      expect(result.source).toBe('fulfillment')
      expect(result.confidence).toBe('high')
    })

    test('handles in_transit status', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        shipment: {
          status: 'InTransit'
        }
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.uiStatus).toBe('in_transit')
      expect(result.source).toBe('shipment')
    })

    test('handles refunded orders', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'refunded'
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.uiStatus).toBe('cancelled')
      expect(result.paymentStatus).toBe('refunded')
      expect(result.source).toBe('backend')
    })
  })

  describe('Data Quality Issues', () => {
    test('handles missing status field', () => {
      const orderData: OrderStatusData = {
        id: 123,
        // status field missing
        fulfillment: {
          status: 'Processing'
        }
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.confidence).toBe('low')
      expect(result.debugInfo.backendStatus).toBe('')
    })

    test('handles invalid status values', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'invalid_status_value',
        fulfillment: {
          status: 'unknown_fulfillment_status'
        }
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.uiStatus).toBe('pending')
      expect(result.confidence).toBe('low')
      expect(result.source).toBe('fallback')
    })

    test('handles empty timeline array', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        tracking_timeline: []
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.debugInfo.hasDelivered).toBe(false)
      expect(result.debugInfo.hasShipped).toBe(false)
      expect(result.debugInfo.timelineEvents).toBe(0)
    })
  })

  describe('Customer vs Admin Context', () => {
    test('behaves consistently across contexts', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        fulfillment: {
          status: 'ReadyToShip'
        }
      }
      
      const adminResult = mapOrderStatus(orderData, 'admin', false)
      const customerResult = mapOrderStatus(orderData, 'customer', false)
      
      expect(adminResult.uiStatus).toBe(customerResult.uiStatus)
      expect(adminResult.paymentStatus).toBe(customerResult.paymentStatus)
    })
  })

  describe('Logging and Debugging', () => {
    test('provides comprehensive debug information', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid',
        fulfillment: {
          status: 'ReadyToShip'
        },
        tracking_timeline: [
          { code: 'created', at: '2024-01-01' },
          { code: 'paid', at: '2024-01-02' }
        ]
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.debugInfo).toEqual({
        backendStatus: 'paid',
        fulfillmentStatus: 'ReadyToShip',
        shipmentStatus: null,
        hasDelivered: false,
        hasShipped: false,
        timelineEvents: 2
      })
    })

    test('flags low confidence mappings', () => {
      const orderData: OrderStatusData = {
        id: 123,
        status: 'paid'
        // Missing fulfillment data
      }
      
      const result = mapOrderStatus(orderData, 'admin', false)
      
      expect(result.confidence).toBe('low')
      expect(result.source).toBe('fallback')
    })
  })
})

// Manual test runner for browser console testing
export function runManualEdgeCaseTests() {
  console.log('🧪 Running Manual Edge Case Tests...')
  
  const testCases = [
    {
      name: 'Null Order Data',
      data: {},
      expected: 'pending'
    },
    {
      name: 'Pending Dispatch',
      data: {
        id: 123,
        status: 'paid',
        fulfillment: { status: 'ReadyToShip' }
      },
      expected: 'pending_dispatch'
    },
    {
      name: 'Conflicting Status',
      data: {
        id: 123,
        status: 'paid',
        fulfillment: { status: 'Processing' },
        tracking_timeline: [{ code: 'dispatched' }]
      },
      expected: 'shipped'
    }
  ]

  testCases.forEach(testCase => {
    const result = mapOrderStatus(testCase.data as OrderStatusData, 'admin', true)
    const passed = result.uiStatus === testCase.expected
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}:`, {
      expected: testCase.expected,
      actual: result.uiStatus,
      confidence: result.confidence,
      source: result.source
    })
  })
  
  console.log('🧪 Manual tests completed!')
}
