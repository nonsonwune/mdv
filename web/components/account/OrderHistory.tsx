"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, Button, Badge, EmptyState, Input, Modal } from '../ui'
import { formatNaira } from '../../lib/format'

export interface Order {
  id: string
  orderNumber: string
  date: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  items: Array<{
    id: string
    productId: string
    title: string
    variant: string
    quantity: number
    price: number
    image?: string
  }>
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  shippingAddress: {
    name: string
    address: string
    city: string
    state: string
    phone: string
  }
  paymentMethod: {
    type: string
    last4?: string
  }
  trackingNumber?: string
  estimatedDelivery?: string
  deliveredDate?: string
}

interface OrderHistoryProps {
  userId?: number | string
}

export default function OrderHistory({ userId }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      // First try to load from API
      const apiOrders = await loadOrdersFromAPI()
      
      // If API returns orders, use those and cache them
      if (apiOrders.length > 0) {
        setOrders(apiOrders)
        setFilteredOrders(apiOrders)
        // Cache in localStorage for offline access
        localStorage.setItem('mdv_orders', JSON.stringify(apiOrders))
      } else {
        // If no orders from API, check localStorage for cached orders
        const storedOrders = localStorage.getItem('mdv_orders')
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders)
          setOrders(parsed)
          setFilteredOrders(parsed)
        } else {
          // No orders at all - show empty state
          setOrders([])
          setFilteredOrders([])
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      // Fallback to localStorage if API fails
      const storedOrders = localStorage.getItem('mdv_orders')
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders)
        setOrders(parsed)
        setFilteredOrders(parsed)
      } else {
        setOrders([])
        setFilteredOrders([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    filterOrders()
  }, [filterStatus, searchQuery, dateRange, orders])

  const filterOrders = () => {
    let filtered = [...orders]

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(query) ||
        order.items.some(item => item.title.toLowerCase().includes(query))
      )
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(order => 
        new Date(order.date) >= new Date(dateRange.start)
      )
    }
    if (dateRange.end) {
      filtered = filtered.filter(order => 
        new Date(order.date) <= new Date(dateRange.end)
      )
    }

    setFilteredOrders(filtered)
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'processing': return 'primary'
      case 'shipped': return 'primary'
      case 'delivered': return 'success'
      case 'cancelled': return 'danger'
      case 'refunded': return 'neutral'
      default: return 'neutral'
    }
  }

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Pending Payment'
      case 'processing': return 'Processing'
      case 'shipped': return 'Shipped'
      case 'delivered': return 'Delivered'
      case 'cancelled': return 'Cancelled'
      case 'refunded': return 'Refunded'
      default: return status
    }
  }

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      case 'processing':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      case 'shipped':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      case 'delivered':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      case 'cancelled':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      default:
        return null
    }
  }

  const loadOrdersFromAPI = async (): Promise<Order[]> => {
    try {
      const response = await fetch('/api/orders', {
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.orders || []
      }
    } catch (error) {
      console.error('Error loading orders from API:', error)
    }
    return []
  }

  const handleReorder = (order: Order) => {
    // Add items to cart
    order.items.forEach(item => {
      // In a real app, this would add to cart
      console.log('Adding to cart:', item)
    })
  }

  const handleTrackOrder = (order: Order) => {
    if (order.trackingNumber) {
      // TODO: Integrate with real shipping provider tracking API
      console.log('Track order:', order.trackingNumber)
      alert(`Tracking Number: ${order.trackingNumber}\n\nPlease contact customer service for tracking details.`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/4 mb-4" />
              <div className="h-3 bg-neutral-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-neutral-200 rounded w-1/3" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-2">
              <Input
                placeholder="Search orders by number or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="sr-only" htmlFor="order-status">Status</label>
              <select
                id="order-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                placeholder="From"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                placeholder="To"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          title="No orders found"
          description={searchQuery || filterStatus !== 'all' ? "Try adjusting your filters" : "Your order history will appear here"}
          action={
            searchQuery || filterStatus !== 'all' ? (
              <Button onClick={() => {
                setSearchQuery('')
                setFilterStatus('all')
                setDateRange({ start: '', end: '' })
              }}>
                Clear Filters
              </Button>
            ) : (
              <Link href="/">
                <Button>Start Shopping</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="p-6">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base sm:text-lg truncate max-w-[220px] sm:max-w-none">{order.orderNumber}</h3>
                      <Badge variant={getStatusColor(order.status)} size="sm">
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {getStatusText(order.status)}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-600">
                      Ordered on {new Date(order.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <p className="text-xl font-semibold text-maroon-700">
                    {formatNaira(order.total)}
                  </p>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 bg-neutral-50 rounded-lg">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm border">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.title}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{item.title}</p>
                        {item.variant && (
                          <p className="text-xs text-neutral-600 mt-1">
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {item.variant}
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-neutral-500 mt-1">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNaira(item.price * item.quantity)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatNaira(item.price)} each
                        </p>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-center py-2">
                      <p className="text-sm text-neutral-600 bg-neutral-100 rounded-full px-3 py-1 inline-block">
                        +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Delivery Info */}
                {order.status === 'shipped' && order.estimatedDelivery && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                      <span className="text-sm font-semibold text-blue-900">In Transit</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {order.trackingNumber && (
                      <p className="text-xs text-blue-700 mt-1 font-mono">
                        Tracking: {order.trackingNumber}
                      </p>
                    )}
                  </div>
                )}

                {order.status === 'delivered' && order.deliveredDate && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-green-900">Successfully Delivered</span>
                    </div>
                    <p className="text-sm text-green-800">
                      Delivered on {new Date(order.deliveredDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {order.status === 'processing' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm font-semibold text-amber-900">Order Processing</span>
                    </div>
                    <p className="text-sm text-amber-800">
                      Your order is being prepared for shipment. You'll receive tracking information once it ships.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-200">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedOrder(order)}
                    className="flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Details
                  </Button>

                  {['shipped', 'delivered'].includes(order.status) && order.trackingNumber && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleTrackOrder(order)}
                      className="flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Track Package
                    </Button>
                  )}

                  {order.status === 'delivered' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReorder(order)}
                        className="flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Buy Again
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Leave Review
                      </Button>
                    </>
                  )}

                  {order.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="danger"
                      className="flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        size="lg"
        bodyClassName="max-h-[70vh] overflow-y-auto"
      >
        {selectedOrder && (
          <div className="p-6 space-y-6">
            {/* Order Info */}
            <div>
              <h3 className="font-semibold mb-3">Order Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-600">Order Number</p>
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-neutral-600">Order Date</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-600">Status</p>
                  <Badge variant={getStatusColor(selectedOrder.status)} size="sm">
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedOrder.status)}
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </Badge>
                </div>
                <div>
                  <p className="text-neutral-600">Payment Method</p>
                  <p className="font-medium">
                    {selectedOrder.paymentMethod.type}
                    {selectedOrder.paymentMethod.last4 && ` •••• ${selectedOrder.paymentMethod.last4}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="font-semibold mb-3">Shipping Address</h3>
              <div className="text-sm">
                <p>{selectedOrder.shippingAddress.name}</p>
                <p>{selectedOrder.shippingAddress.address}</p>
                <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</p>
                <p>{selectedOrder.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-semibold mb-3">Items</h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-neutral-50 rounded-lg">
                    <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm border">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                          <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      {item.variant && (
                        <p className="text-sm text-neutral-600 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {item.variant}
                          </span>
                        </p>
                      )}
                      <p className="text-sm text-neutral-600 mt-1">
                        {formatNaira(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg text-gray-900">
                        {formatNaira(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            <div>
              <h3 className="font-semibold mb-3">Price Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatNaira(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatNaira(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{selectedOrder.shipping === 0 ? 'FREE' : formatNaira(selectedOrder.shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatNaira(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t">
                  <span>Total</span>
                  <span className="text-maroon-700">{formatNaira(selectedOrder.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
