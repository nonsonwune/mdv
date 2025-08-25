"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button, Card, Badge } from '../ui'
import { formatNaira } from '../../lib/format'
import confetti from 'canvas-confetti'

interface OrderDetails {
  orderId: string
  orderDate: Date
  items: Array<{
    id: number
    title: string
    variant_id: number
    qty: number
    price: number
    image_url?: string
  }>
  shipping: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    state: string
    postalCode: string
    country: string
    phone: string
    email: string
  }
  payment: {
    method: string
    last4?: string
    brand?: string
  }
  totals: {
    subtotal: number
    shipping: number
    tax: number
    discount: number
    total: number
  }
  estimatedDelivery: Date
  trackingNumber?: string
}

interface OrderConfirmationProps {
  order: OrderDetails
}

export default function OrderConfirmation({ order }: OrderConfirmationProps) {
  const [emailSent, setEmailSent] = useState(false)
  const [showFullDetails, setShowFullDetails] = useState(false)

  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#7B2C3A', '#FFD700', '#4CAF50']
    })

    // Save order to localStorage for order history
    const orders = JSON.parse(localStorage.getItem('mdv_orders') || '[]')
    orders.unshift(order)
    localStorage.setItem('mdv_orders', JSON.stringify(orders.slice(0, 50))) // Keep last 50 orders
  }, [order])

  const sendOrderEmail = () => {
    // Simulate sending email
    setTimeout(() => {
      setEmailSent(true)
    }, 1000)
  }

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.orderId)
    // You could show a toast here
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-lg text-neutral-600">
              Thank you for your purchase, {order.shipping.firstName}
            </p>
            
            <div className="mt-4 p-4 bg-white rounded-lg shadow-sm inline-block">
              <p className="text-sm text-neutral-600 mb-1">Order Number</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-mono font-bold text-maroon-700">
                  {order.orderId}
                </p>
                <button
                  onClick={copyOrderId}
                  className="text-neutral-400 hover:text-neutral-600"
                  title="Copy order ID"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-medium mb-1">Order Details</h3>
              <p className="text-xs text-neutral-600 mb-3">
                View and print your order details
              </p>
              <Button size="sm" variant="secondary" onClick={() => setShowFullDetails(!showFullDetails)}>
                {showFullDetails ? 'Hide' : 'View'} Details
              </Button>
            </Card>

            <Card className="p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="font-medium mb-1">Track Package</h3>
              <p className="text-xs text-neutral-600 mb-3">
                Track your order in real-time
              </p>
              <Button size="sm" variant="secondary" disabled>
                Coming Soon
              </Button>
            </Card>

            <Card className="p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-medium mb-1">Email Receipt</h3>
              <p className="text-xs text-neutral-600 mb-3">
                Get a copy sent to your email
              </p>
              <Button 
                size="sm" 
                variant={emailSent ? "success" : "secondary"}
                onClick={sendOrderEmail}
                disabled={emailSent}
              >
                {emailSent ? '✓ Sent' : 'Send Email'}
              </Button>
            </Card>
          </div>

          {/* Order Summary */}
          <Card className="mb-8">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              {/* Delivery Info */}
              <div className="mb-6 p-4 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium text-amber-900">Estimated Delivery</p>
                </div>
                <p className="text-2xl font-bold text-amber-900">
                  {order.estimatedDelivery.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Standard shipping to {order.shipping.city}, {order.shipping.state}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-3 mb-6">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-200 rounded" />
                      )}
                      <Badge 
                        size="sm" 
                        variant="neutral"
                        className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
                      >
                        {item.qty}
                      </Badge>
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-neutral-600">
                        {formatNaira(item.price)} × {item.qty}
                      </p>
                    </div>
                    
                    <div className="text-sm font-medium">
                      {formatNaira(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span>{formatNaira(order.totals.subtotal)}</span>
                </div>
                {order.totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatNaira(order.totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Shipping</span>
                  <span>{order.totals.shipping === 0 ? 'FREE' : formatNaira(order.totals.shipping)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Tax</span>
                  <span>{formatNaira(order.totals.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total Paid</span>
                  <span className="text-maroon-700">{formatNaira(order.totals.total)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Full Details (Collapsible) */}
          {showFullDetails && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <div className="p-4">
                  <h3 className="font-semibold mb-3">Shipping Address</h3>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">
                      {order.shipping.firstName} {order.shipping.lastName}
                    </p>
                    <p>{order.shipping.address1}</p>
                    {order.shipping.address2 && <p>{order.shipping.address2}</p>}
                    <p>
                      {order.shipping.city}, {order.shipping.state} {order.shipping.postalCode}
                    </p>
                    <p>{order.shipping.country}</p>
                    <p className="pt-2">{order.shipping.phone}</p>
                    <p>{order.shipping.email}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <h3 className="font-semibold mb-3">Payment Method</h3>
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-8 bg-neutral-100 rounded flex items-center justify-center text-xs font-medium">
                        {order.payment.brand || 'Card'}
                      </div>
                      <div>
                        <p className="font-medium">
                          {order.payment.method}
                        </p>
                        {order.payment.last4 && (
                          <p className="text-xs text-neutral-600">
                            •••• {order.payment.last4}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-neutral-50 rounded-lg p-6">
            <h3 className="font-semibold mb-4">What's Next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-maroon-700 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Order Confirmation Email</p>
                  <p className="text-sm text-neutral-600">
                    You'll receive an email confirmation at {order.shipping.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-maroon-700 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Shipping Notification</p>
                  <p className="text-sm text-neutral-600">
                    We'll notify you when your order ships with tracking details
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-maroon-700 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Delivery</p>
                  <p className="text-sm text-neutral-600">
                    Your order will arrive by {order.estimatedDelivery.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link href="/" className="flex-1">
              <Button variant="primary" className="w-full">
                Continue Shopping
              </Button>
            </Link>
            <Link href="/account" className="flex-1">
              <Button variant="secondary" className="w-full">
                View Order History
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
