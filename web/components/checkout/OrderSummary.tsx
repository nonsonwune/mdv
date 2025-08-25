"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Card, Button, Badge, Input } from '../ui'
import { formatNaira } from '../../lib/format'
import type { CartData } from '../../lib/cart'

interface OrderSummaryProps {
  cart: CartData
  editable?: boolean
  onUpdateQuantity?: (itemId: number, quantity: number) => Promise<void>
}

export default function OrderSummary({ 
  cart, 
  editable = false,
  onUpdateQuantity 
}: OrderSummaryProps) {
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  const [promoError, setPromoError] = useState('')
  const [expandedItems, setExpandedItems] = useState(false)

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum, item) => sum + (item.price || 0) * item.qty, 
    0
  )

  // Mock promo codes
  const promoCodes: Record<string, number> = {
    'SAVE10': 0.10,
    'WELCOME15': 0.15,
    'MDV20': 0.20,
  }

  const discount = appliedPromo && promoCodes[appliedPromo] 
    ? subtotal * promoCodes[appliedPromo] 
    : 0

  const shipping = subtotal > 50000 ? 0 : 2500
  const tax = (subtotal - discount) * 0.075 // 7.5% VAT
  const total = subtotal - discount + shipping + tax

  const applyPromoCode = () => {
    const code = promoCode.toUpperCase()
    setPromoError('')
    
    if (promoCodes[code]) {
      setAppliedPromo(code)
      setPromoCode('')
    } else {
      setPromoError('Invalid promo code')
    }
  }

  const removePromoCode = () => {
    setAppliedPromo(null)
    setPromoError('')
  }

  return (
    <Card className="sticky top-4">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

        {/* Items List */}
        <div className="space-y-3 mb-4">
          <button
            onClick={() => setExpandedItems(!expandedItems)}
            className="flex items-center justify-between w-full text-sm"
          >
            <span className="font-medium">
              {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
            </span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedItems ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedItems && (
            <div className="space-y-3 pt-3 border-t">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title || 'Product'}
                        fill
                        className="object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-200 rounded" />
                    )}
                    <Badge 
                      size="sm" 
                      variant="neutral"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 flex items-center justify-center"
                    >
                      {item.qty}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.title || `Item #${item.variant_id}`}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {formatNaira(item.price || 0)} each
                    </p>
                    
                    {editable && onUpdateQuantity && (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.qty - 1)}
                          className="w-6 h-6 rounded border text-xs hover:bg-neutral-50"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-xs">{item.qty}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.qty + 1)}
                          className="w-6 h-6 rounded border text-xs hover:bg-neutral-50"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm font-medium">
                    {formatNaira((item.price || 0) * item.qty)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promo Code */}
        <div className="py-4 border-t">
          {!appliedPromo ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Promo Code</label>
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  size="sm"
                  error={promoError}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={applyPromoCode}
                  disabled={!promoCode}
                >
                  Apply
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">
                  Promo Applied: {appliedPromo}
                </p>
                <p className="text-xs text-green-600">
                  You saved {formatNaira(discount)}!
                </p>
              </div>
              <button
                onClick={removePromoCode}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3 py-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatNaira(discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Shipping</span>
            <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
              {shipping === 0 ? 'FREE' : formatNaira(shipping)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Tax (VAT)</span>
            <span>{formatNaira(tax)}</span>
          </div>
          
          {shipping > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-800">
                Add {formatNaira(50000 - subtotal)} more for free shipping!
              </p>
              <div className="mt-2 w-full bg-amber-200 rounded-full h-1.5">
                <div 
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min((subtotal / 50000) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="py-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <div className="text-right">
              <p className="text-2xl font-bold text-maroon-700">
                {formatNaira(total)}
              </p>
              <p className="text-xs text-neutral-600">
                or 3 payments of {formatNaira(total / 3)}
              </p>
            </div>
          </div>
        </div>

        {/* Guarantees */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Secure Checkout</p>
              <p className="text-xs text-neutral-600">SSL encrypted payment</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Money Back Guarantee</p>
              <p className="text-xs text-neutral-600">7-day return policy</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
