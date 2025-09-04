/**
 * Integration tests for Admin Order Detail Page
 * 
 * Tests the order status update flow, validation, and UX improvements
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import OrderDetailPage from '../[id]/page'

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  api: jest.fn()
}))

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { role: 'admin', name: 'Test Admin' },
    loading: false
  })
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '14' }),
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn()
  })
}))

const mockApi = require('@/lib/api-client').api

describe('Admin Order Detail Page - Status Update Flow', () => {
  const mockOrderData = {
    id: 14,
    status: 'Paid',
    payment_status: 'paid',
    total: 199.99,
    item_count: 2,
    created_at: '2024-01-01T10:00:00Z',
    user: { name: 'John Doe', email: 'john@example.com' },
    shipping_address: { name: 'John Doe', city: 'Lagos', state: 'Lagos' },
    items: [],
    tracking_timeline: [],
    fulfillment: {
      status: 'Processing',
      packed_by: 1,
      packed_at: '2024-01-01T10:00:00Z',
      notes: 'Order being prepared'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockApi.mockResolvedValue(mockOrderData)
  })

  test('renders order details correctly', async () => {
    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Order #14')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  test('validates status transitions before API call', async () => {
    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('processing')).toBeInTheDocument()
    })

    // Try invalid transition: processing -> delivered (should skip pending_dispatch)
    const statusSelect = screen.getByDisplayValue('processing')
    fireEvent.change(statusSelect, { target: { value: 'delivered' } })

    const updateButton = screen.getByText('Update Order')
    fireEvent.click(updateButton)

    // Should show validation error without making API call
    await waitFor(() => {
      expect(screen.getByText(/Invalid status transition/)).toBeInTheDocument()
    })

    expect(mockApi).toHaveBeenCalledTimes(1) // Only the initial fetch
  })

  test('allows valid status transition: processing -> pending_dispatch', async () => {
    mockApi
      .mockResolvedValueOnce(mockOrderData) // Initial fetch
      .mockResolvedValueOnce({}) // Update API call
      .mockResolvedValueOnce({ // Refresh after update
        ...mockOrderData,
        fulfillment: {
          ...mockOrderData.fulfillment,
          status: 'ReadyToShip'
        }
      })

    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('processing')).toBeInTheDocument()
    })

    // Valid transition: processing -> pending_dispatch
    const statusSelect = screen.getByDisplayValue('processing')
    fireEvent.change(statusSelect, { target: { value: 'pending_dispatch' } })

    const updateButton = screen.getByText('Update Order')
    fireEvent.click(updateButton)

    // Should make API call and show success
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/admin/orders/14', {
        method: 'PUT',
        body: JSON.stringify({ status: 'pending_dispatch' })
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Order updated successfully!')).toBeInTheDocument()
    })
  })

  test('shows loading state during update', async () => {
    // Mock a delayed API response
    mockApi
      .mockResolvedValueOnce(mockOrderData)
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('processing')).toBeInTheDocument()
    })

    const statusSelect = screen.getByDisplayValue('processing')
    fireEvent.change(statusSelect, { target: { value: 'pending_dispatch' } })

    const updateButton = screen.getByText('Update Order')
    fireEvent.click(updateButton)

    // Should show loading state
    expect(screen.getByText('Updating...')).toBeInTheDocument()
    expect(updateButton).toBeDisabled()
  })

  test('handles API errors gracefully with rollback', async () => {
    mockApi
      .mockResolvedValueOnce(mockOrderData) // Initial fetch
      .mockRejectedValueOnce(new Error('409 Conflict')) // Update fails

    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('processing')).toBeInTheDocument()
    })

    const statusSelect = screen.getByDisplayValue('processing')
    fireEvent.change(statusSelect, { target: { value: 'pending_dispatch' } })

    const updateButton = screen.getByText('Update Order')
    fireEvent.click(updateButton)

    // Should show error message and rollback optimistic update
    await waitFor(() => {
      expect(screen.getByText(/Update conflict/)).toBeInTheDocument()
    })

    // Status should be rolled back to original value
    expect(screen.getByDisplayValue('processing')).toBeInTheDocument()
  })

  test('prevents updates when no changes detected', async () => {
    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('processing')).toBeInTheDocument()
    })

    // Click update without making changes
    const updateButton = screen.getByText('Update Order')
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(screen.getByText('No changes detected.')).toBeInTheDocument()
    })

    // Should not make API call
    expect(mockApi).toHaveBeenCalledTimes(1) // Only initial fetch
  })

  test('admin can modify payment status for non-Paystack orders', async () => {
    const orderWithoutPaystack = {
      ...mockOrderData,
      payment_ref: null // No Paystack reference
    }

    mockApi.mockResolvedValue(orderWithoutPaystack)

    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('paid')).toBeInTheDocument()
    })

    // Payment status should be editable
    const paymentSelect = screen.getByDisplayValue('paid')
    expect(paymentSelect).not.toBeDisabled()
  })

  test('payment status is read-only for Paystack orders', async () => {
    const paystackOrder = {
      ...mockOrderData,
      payment_ref: 'paystack_ref_123'
    }

    mockApi.mockResolvedValue(paystackOrder)

    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Paystack orders are read-only')).toBeInTheDocument()
    })
  })

  test('Paystack orders do not send payment_status in update requests', async () => {
    const paystackOrder = {
      ...mockOrderData,
      payment_ref: 'paystack_ref_123',
      payment_status: 'paid'
    }

    mockApi.mockResolvedValue(paystackOrder)

    render(<OrderDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Paystack orders are read-only')).toBeInTheDocument()
    })

    // Try to update the order (only tracking number should be sent)
    const trackingInput = screen.getByPlaceholderText('Enter tracking number')
    fireEvent.change(trackingInput, { target: { value: 'TRACK123' } })

    const updateButton = screen.getByText('Update Order')
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        '/api/admin/orders/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            tracking_number: 'TRACK123'
            // payment_status should NOT be included
          })
        })
      )
    })
  })
})
