/**
 * Simple test runner for status mapper tests
 * Run with: node web/lib/__tests__/test-runner.js
 */

// Mock Jest globals for our test environment
global.describe = (name, fn) => {
  console.log(`\n📋 ${name}`)
  fn()
}

global.test = (name, fn) => {
  try {
    fn()
    console.log(`  ✅ ${name}`)
  } catch (error) {
    console.log(`  ❌ ${name}`)
    console.log(`     Error: ${error.message}`)
  }
}

global.expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}`)
    }
  },
  toEqual: (expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    }
  }
})

// Import and run the status mapper tests
console.log('🧪 Running Status Mapper Tests...\n')

try {
  // Import the status mapper functions
  const { 
    mapOrderStatus, 
    isValidStatusTransition, 
    getAllowedNextStatuses 
  } = require('../status-mapper.ts')

  // Run basic functionality tests
  describe('Status Transition Validation', () => {
    test('allows valid transitions', () => {
      expect(isValidStatusTransition('pending', 'processing')).toBe(true)
      expect(isValidStatusTransition('processing', 'pending_dispatch')).toBe(true)
      expect(isValidStatusTransition('pending_dispatch', 'shipped')).toBe(true)
    })

    test('rejects invalid transitions', () => {
      expect(isValidStatusTransition('pending', 'delivered')).toBe(false)
      expect(isValidStatusTransition('delivered', 'processing')).toBe(false)
      expect(isValidStatusTransition('cancelled', 'processing')).toBe(false)
    })

    test('allows same status transitions', () => {
      expect(isValidStatusTransition('processing', 'processing')).toBe(true)
      expect(isValidStatusTransition('pending_dispatch', 'pending_dispatch')).toBe(true)
    })
  })

  describe('Pending Dispatch Status Mapping - Bug Fix', () => {
    test('correctly maps ReadyToShip fulfillment to pending_dispatch', () => {
      const orderData = {
        id: 14,
        status: 'Paid',
        fulfillment: {
          status: 'ReadyToShip',
          packed_by: 1,
          packed_at: '2024-01-01T10:00:00Z'
        },
        tracking_timeline: []
      }

      const result = mapOrderStatus(orderData, 'admin', false)

      expect(result.uiStatus).toBe('pending_dispatch')
      expect(result.confidence).toBe('high')
      expect(result.source).toBe('fulfillment')
    })

    test('improved fallback confidence for paid orders', () => {
      const orderData = {
        id: 14,
        status: 'paid',
        fulfillment: null,
        tracking_timeline: []
      }

      const result = mapOrderStatus(orderData, 'admin', false)

      expect(result.uiStatus).toBe('processing')
      expect(result.confidence).toBe('medium') // Improved from 'low'
      expect(result.source).toBe('fallback')
    })
  })

  console.log('\n🎉 All tests completed!')

} catch (error) {
  console.error('❌ Test runner failed:', error.message)
  console.log('\nNote: This simple test runner may not work with TypeScript imports.')
  console.log('For full testing, consider setting up Jest or Vitest.')
}
