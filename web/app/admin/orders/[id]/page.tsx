'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import {
  mapOrderStatus,
  getStatusColor,
  getPaymentStatusColor,
  formatStatusDisplay,
  isValidStatusTransition,
  type OrderStatusData,
  type OrderUIStatus
} from '@/lib/status-mapper'
import {
  ArrowLeftIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  MapPinIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  PrinterIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

// Helper to format status labels safely (handles camel case like "PendingPayment")
const labelize = (s?: string) => {
  if (!s) return 'Unknown'
  const str = String(s)
  const spaced = str.replace(/([a-z])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// Normalize backend admin order response into this page's Order shape
const normalizeOrderData = (raw: any): Order => {
  // Use centralized status mapping utility
  const statusResult = mapOrderStatus(raw as OrderStatusData, 'admin', true)

  // Log additional context for admin debugging
  if (statusResult.confidence === 'low') {
    console.warn('⚠️ Low confidence order status mapping detected:', {
      orderId: raw?.id,
      recommendedAction: 'Review order data quality and status consistency'
    })
  }

  // Use payment status from centralized mapper
  const paymentStatus = statusResult.paymentStatus

  // Derive shipped/delivered timestamps from timeline
  const timeline = raw?.tracking_timeline || []
  const shippedEvent = timeline.find((e: any) => ['shipped', 'dispatched'].includes((e.code || '').toLowerCase()))
  const deliveredEvent = timeline.find((e: any) => (e.code || '').toLowerCase() === 'delivered')

  // Best-effort tracking details
  const trackingNumber = shippedEvent?.tracking_id || ''
  // carrier isn't explicitly provided in raw; keep empty

  const user = raw?.user || {}
  const addr = raw?.shipping_address || {}

  return {
    id: raw?.id,
    order_number: String(raw?.id ?? ''),
    status: statusResult.uiStatus,
    payment_status: statusResult.paymentStatus,
    payment_method: undefined,
    total_amount: Number(raw?.total ?? 0),
    subtotal: 0,
    shipping_cost: 0,
    tax_amount: 0,
    discount_amount: 0,
    coupon_code: undefined,
    customer_id: undefined,
    customer_name: user?.name || addr?.name || 'Guest',
    customer_email: user?.email || '',
    customer_phone: undefined,
    shipping_address: {
      full_name: addr?.name || user?.name || '',
      address_line_1: addr?.street || addr?.city || '',
      address_line_2: '',
      city: addr?.city || '',
      state: addr?.state || '',
      postal_code: '',
      country: ''
    },
    billing_address: undefined,
    created_at: raw?.created_at || new Date().toISOString(),
    updated_at: raw?.created_at || new Date().toISOString(),
    shipped_at: shippedEvent?.at,
    delivered_at: deliveredEvent?.at,
    tracking_number: trackingNumber,
    carrier: '',
    items: Array.isArray(raw?.items) ? raw.items : [],
    notes: undefined,
    customer_notes: undefined,
  }
}

interface OrderItem {
  id: number
  product_id: number
  variant_id: number
  product_title: string
  variant_name?: string
  sku: string
  size?: string
  color?: string
  quantity: number
  unit_price: number
  total_price: number
  image_url?: string
}

interface Order {
  id: number
  order_number: string
  status: 'pending' | 'processing' | 'pending_dispatch' | 'in_transit' | 'shipped' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method?: string
  total_amount: number
  subtotal: number
  shipping_cost: number
  tax_amount: number
  discount_amount?: number
  coupon_code?: string
  
  // Customer info
  customer_id?: number
  customer_name: string
  customer_email: string
  customer_phone?: string
  
  // Shipping address
  shipping_address: {
    full_name: string
    address_line_1: string
    address_line_2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  
  // Billing address
  billing_address?: {
    full_name: string
    address_line_1: string
    address_line_2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  
  // Timestamps
  created_at: string
  updated_at: string
  shipped_at?: string
  delivered_at?: string
  
  // Tracking
  tracking_number?: string
  carrier?: string
  
  // Items
  items: OrderItem[]
  
  // Notes
  notes?: string
  customer_notes?: string
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [newPaymentStatus, setNewPaymentStatus] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [notes, setNotes] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrder()
  }, [params.id])

  useEffect(() => {
    if (order) {
      setNewStatus(order.status || 'pending')
      setNewPaymentStatus(order.payment_status || 'pending')
      setTrackingNumber(order.tracking_number || '')
      setCarrier(order.carrier || '')
      setNotes(order.notes || '')
    }
  }, [order])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await api<any>(`/api/admin/orders/${params.id}`)
      setOrder(normalizeOrderData(response))
    } catch (error) {
      console.error('Failed to fetch order:', error)
      alert('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOrder = async () => {
    if (!order) return

    // Clear previous feedback
    setUpdateSuccess(false)
    setUpdateError(null)

    // Validate status transition if status is being changed
    if (newStatus !== order.status) {
      if (!isValidStatusTransition(order.status as OrderUIStatus, newStatus as OrderUIStatus)) {
        setUpdateError(`Invalid status transition from "${formatStatusDisplay(order.status)}" to "${formatStatusDisplay(newStatus)}". Please check the allowed workflow.`)
        return
      }
    }

    const updateData: any = {}
    if (newStatus !== order.status) updateData.status = newStatus
    if (newPaymentStatus !== order.payment_status) updateData.payment_status = newPaymentStatus
    if (trackingNumber !== (order.tracking_number || '')) updateData.tracking_number = trackingNumber
    if (carrier !== (order.carrier || '')) updateData.carrier = carrier
    if (notes !== (order.notes || '')) updateData.notes = notes

    if (Object.keys(updateData).length === 0) {
      setUpdateError('No changes detected.')
      return
    }

    setUpdating(true)

    // Optimistic update - immediately update UI
    const previousOrder = { ...order }
    setOrder(prev => prev ? {
      ...prev,
      status: updateData.status || prev.status,
      payment_status: updateData.payment_status || prev.payment_status,
      tracking_number: updateData.tracking_number || prev.tracking_number,
      carrier: updateData.carrier || prev.carrier,
      notes: updateData.notes || prev.notes
    } : null)

    try {
      await api(`/api/admin/orders/${order.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      // Refresh order data to get the latest state from server
      await fetchOrder()
      setUpdateSuccess(true)

      // Auto-hide success message after 3 seconds
      setTimeout(() => setUpdateSuccess(false), 3000)

    } catch (error) {
      console.error('Failed to update order:', error)

      // Rollback optimistic update
      setOrder(previousOrder)

      // Provide more specific error messages
      let errorMessage = 'Failed to update order'
      if (error instanceof Error) {
        if (error.message.includes('409')) {
          errorMessage = 'Update conflict: The order status cannot be changed due to business rules (e.g., shipment already exists).'
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid update request: Please check your input values.'
        } else if (error.message.includes('403')) {
          errorMessage = 'Permission denied: You do not have permission to perform this update.'
        }
      }

      setUpdateError(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase()
    switch (s) {
      case 'pending':
      case 'pendingpayment':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending_dispatch':
        return 'bg-orange-100 text-orange-800'
      case 'in_transit':
        return 'bg-indigo-100 text-indigo-800'
      case 'shipped':
      case 'dispatched':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
      case 'refunded':
        return 'bg-gray-100 text-gray-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    const s = (status || '').toLowerCase()
    switch (s) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Show loading state while authentication is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  // Check if user is authenticated after auth loading is complete
  if (!authLoading && !user) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-500 mb-4">You must be logged in to access this page.</p>
        <button
          onClick={() => router.push('/staff-login')}
          className="text-maroon-600 hover:text-maroon-500"
        >
          Go to Login
        </button>
      </div>
    )
  }

  // Show loading state while order data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
        <p className="text-gray-500 mb-4">The order you're looking for doesn't exist.</p>
        <button
          onClick={() => router.back()}
          className="text-maroon-600 hover:text-maroon-500"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
            <p className="text-gray-600">Created {formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-3 mb-4">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(order.status)}`}>
            {labelize(order.status)}
          </span>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
            Payment {labelize(order.payment_status)}
          </span>
        </div>

        {/* Feedback Messages */}
        {updateSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
            <CheckCircleIcon className="h-5 w-5" />
            <span>Order updated successfully!</span>
          </div>
        )}

        {updateError && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>{updateError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <PrinterIcon className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={handleUpdateOrder}
            disabled={updating}
            className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 transition-colors"
          >
            {updating ? (
              <ClockIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PencilIcon className="h-4 w-4" />
            )}
            {updating ? 'Updating...' : 'Update Order'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product_title}</h4>
                      <p className="text-sm text-gray-500">
                        SKU: {item.sku}
                        {(item.size || item.color) && (
                          <span className="ml-2">
                            {[item.size, item.color].filter(Boolean).join(' / ')}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} × {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(item.total_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Contact Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{order.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{order.customer_email}</span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{order.customer_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Shipping Address</h4>
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p>{order.shipping_address.full_name}</p>
                      <p>{order.shipping_address.address_line_1}</p>
                      {order.shipping_address.address_line_2 && (
                        <p>{order.shipping_address.address_line_2}</p>
                      )}
                      <p>
                        {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                      </p>
                      <p>{order.shipping_address.country}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(order.customer_notes || order.notes) && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Notes</h3>
              </div>
              <div className="p-6 space-y-4">
                {order.customer_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Customer Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{order.customer_notes}</p>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Internal Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Order Summary</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{formatCurrency(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
                {order.discount_amount && order.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>
                      Discount {order.coupon_code && `(${order.coupon_code})`}
                    </span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Payment</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{order.payment_method || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPaymentStatusColor(order.payment_status)}`}>
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Shipping</h3>
            </div>
            <div className="p-6 space-y-4">
              {order.tracking_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{order.tracking_number}</p>
                </div>
              )}
              {order.carrier && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                  <p className="text-sm text-gray-900">{order.carrier}</p>
                </div>
              )}
              {order.shipped_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipped At</label>
                  <p className="text-sm text-gray-900">{formatDate(order.shipped_at)}</p>
                </div>
              )}
              {order.delivered_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivered At</label>
                  <p className="text-sm text-gray-900">{formatDate(order.delivered_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Update Order */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Update Order</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="pending_dispatch">Pending Dispatch</option>
                  <option value="in_transit">In Transit</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                {/* Check if user can modify payment status - ensure user exists and has admin role */}
                {user && user.role === 'admin' && !order.payment_ref ? (
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-gray-600">
                      {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {order.payment_ref
                        ? "Paystack orders are read-only"
                        : "Only Admin users can modify payment status"
                      }
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                  placeholder="Enter tracking number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                  placeholder="e.g., UPS, FedEx, USPS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                  placeholder="Add internal notes..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

