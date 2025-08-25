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
    // Load orders from localStorage
    const storedOrders = localStorage.getItem('mdv_orders')
    if (storedOrders) {
      const parsed = JSON.parse(storedOrders)
      setOrders(parsed)
      setFilteredOrders(parsed)
    } else {
      // Generate mock orders for demo
      const mockOrders = generateMockOrders()
      setOrders(mockOrders)
      setFilteredOrders(mockOrders)
      localStorage.setItem('mdv_orders', JSON.stringify(mockOrders))
    }
    setLoading(false)
  }, [])

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

  const generateMockOrders = (): Order[] => {
    return [
      {
        id: '1',
        orderNumber: 'MDV-2024-001',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'delivered',
        items: [
          {
            id: '1',
            productId: 'p1',
            title: 'Classic White T-Shirt',
            variant: 'Size: L, Color: White',
            quantity: 2,
            price: 15000,
            image: '/api/placeholder/100/100'
          },
          {
            id: '2',
            productId: 'p2',
            title: 'Denim Jeans',
            variant: 'Size: 32, Color: Blue',
            quantity: 1,
            price: 35000,
            image: '/api/placeholder/100/100'
          }
        ],
        subtotal: 65000,
        shipping: 2500,
        tax: 5063,
        discount: 6500,
        total: 66063,
        shippingAddress: {
          name: 'John Doe',
          address: '123 Victoria Island',
          city: 'Lagos',
          state: 'Lagos',
          phone: '+234 813 651 4087'
        },
        paymentMethod: {
          type: 'Card',
          last4: '4242'
        },
        trackingNumber: 'TRK123456789',
        deliveredDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        orderNumber: 'MDV-2024-002',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'shipped',
        items: [
          {
            id: '3',
            productId: 'p3',
            title: 'Summer Dress',
            variant: 'Size: M, Color: Floral',
            quantity: 1,
            price: 45000,
            image: '/api/placeholder/100/100'
          }
        ],
        subtotal: 45000,
        shipping: 0,
        tax: 3375,
        discount: 0,
        total: 48375,
        shippingAddress: {
          name: 'John Doe',
          address: '123 Victoria Island',
          city: 'Lagos',
          state: 'Lagos',
          phone: '+234 813 651 4087'
        },
        paymentMethod: {
          type: 'Bank Transfer'
        },
        trackingNumber: 'TRK987654321',
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
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
      // In a real app, this would open tracking page
      window.open(`https://track.example.com/${order.trackingNumber}`, '_blank')
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
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>

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
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                      <Badge variant={getStatusColor(order.status)} size="sm">
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-600">
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
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={item.title}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-neutral-600">{item.variant}</p>
                        <p className="text-xs text-neutral-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatNaira(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-sm text-neutral-600">
                      +{order.items.length - 2} more items
                    </p>
                  )}
                </div>

                {/* Delivery Info */}
                {order.status === 'shipped' && order.estimatedDelivery && (
                  <div className="p-3 bg-blue-50 rounded-lg mb-4">
                    <p className="text-sm font-medium text-blue-900">
                      Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                    </p>
                    {order.trackingNumber && (
                      <p className="text-xs text-blue-700">
                        Tracking: {order.trackingNumber}
                      </p>
                    )}
                  </div>
                )}

                {order.status === 'delivered' && order.deliveredDate && (
                  <div className="p-3 bg-green-50 rounded-lg mb-4">
                    <p className="text-sm font-medium text-green-900">
                      Delivered on {new Date(order.deliveredDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </Button>
                  
                  {['shipped', 'delivered'].includes(order.status) && order.trackingNumber && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleTrackOrder(order)}
                    >
                      Track Package
                    </Button>
                  )}
                  
                  {order.status === 'delivered' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReorder(order)}
                      >
                        Buy Again
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                      >
                        Leave Review
                      </Button>
                    </>
                  )}
                  
                  {order.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="danger"
                    >
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
                    {selectedOrder.status}
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
                  <div key={item.id} className="flex gap-3">
                    <div className="w-20 h-20 bg-neutral-100 rounded overflow-hidden">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-neutral-600">{item.variant}</p>
                      <p className="text-sm">
                        {formatNaira(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatNaira(item.price * item.quantity)}
                    </p>
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
