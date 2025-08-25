"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Drawer, Button, EmptyState, Badge } from '../ui'
import { 
  fetchCartOrCreate, 
  updateCartItem, 
  removeCartItem,
  type CartData 
} from '../../lib/cart'
import { formatNaira } from '../../lib/format'
import { useToast } from '../../app/_components/ToastProvider'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [cart, setCart] = useState<CartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set())
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (isOpen) {
      loadCart()
    }
  }, [isOpen])

  async function loadCart() {
    setLoading(true)
    try {
      const data = await fetchCartOrCreate()
      setCart(data)
    } catch (error) {
      console.error('Failed to load cart:', error)
      toast.error('Failed to load cart', 'Please try again')
    } finally {
      setLoading(false)
    }
  }

  async function updateQuantity(itemId: number, newQty: number) {
    if (!cart) return
    
    setUpdatingItems(prev => new Set(prev).add(itemId))
    
    try {
      if (newQty <= 0) {
        const updatedCart = await removeCartItem(cart.id, itemId)
        setCart(updatedCart)
        toast.success('Item removed')
      } else {
        const updatedCart = await updateCartItem(cart.id, itemId, newQty)
        setCart(updatedCart)
      }
    } catch (error) {
      console.error('Failed to update item:', error)
      toast.error('Failed to update item', 'Please try again')
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  async function moveToWishlist(item: any) {
    // Save to wishlist
    const wishlist = JSON.parse(localStorage.getItem('mdv_wishlist') || '[]')
    const product = {
      id: item.variant_id,
      title: item.title,
      slug: `product-${item.variant_id}`,
      images: item.image_url ? [{ url: item.image_url, alt_text: item.title }] : [],
      variants: [{ id: item.variant_id, price: item.price }]
    }
    
    if (!wishlist.find((p: any) => p.id === product.id)) {
      wishlist.push(product)
      localStorage.setItem('mdv_wishlist', JSON.stringify(wishlist))
      
      // Remove from cart
      await updateQuantity(item.id, 0)
      toast.success('Moved to wishlist')
    } else {
      toast.info('Already in wishlist')
    }
  }

  function applyPromoCode() {
    if (promoCode.toUpperCase() === 'SAVE10') {
      setPromoApplied(true)
      toast.success('Promo code applied', '10% discount added')
    } else {
      toast.error('Invalid promo code', 'Please check and try again')
    }
  }

  const subtotal = cart?.items.reduce((total, item) => 
    total + (Number(item.price || 0) * Number(item.qty || 0)), 0
  ) || 0
  
  const discount = promoApplied ? subtotal * 0.1 : 0
  const shipping = subtotal > 50000 ? 0 : 2500
  const total = subtotal - discount + shipping

  const itemCount = cart?.items.reduce((count, item) => count + item.qty, 0) || 0

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Shopping Cart ${itemCount > 0 ? `(${itemCount})` : ''}`}
      size="md"
    >
      <div className="flex flex-col h-full">
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-neutral-200 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-neutral-200 rounded w-3/4" />
                      <div className="h-3 bg-neutral-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : cart && cart.items.length > 0 ? (
            <div className="p-4 space-y-4">
              {/* Free Shipping Progress */}
              {subtotal < 50000 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-900">
                      Add {formatNaira(50000 - subtotal)} more for free shipping!
                    </span>
                    <Badge variant="warning" size="sm">
                      {Math.round((subtotal / 50000) * 100)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((subtotal / 50000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Cart Items */}
              {cart.items.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="relative w-20 h-20 flex-shrink-0">
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
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium mb-1 truncate">
                        {item.title || `Item #${item.variant_id}`}
                      </h4>
                      
                      <div className="text-sm text-neutral-600 mb-2">
                        {formatNaira(item.price || 0)}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.qty - 1)}
                          disabled={updatingItems.has(item.id)}
                          className="w-8 h-8 rounded border border-neutral-300 hover:border-maroon-500 disabled:opacity-50"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm">{item.qty}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          disabled={updatingItems.has(item.id)}
                          className="w-8 h-8 rounded border border-neutral-300 hover:border-maroon-500 disabled:opacity-50"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Item Total & Actions */}
                    <div className="text-right">
                      <div className="font-medium mb-2">
                        {formatNaira((item.price || 0) * item.qty)}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveToWishlist(item)}
                          className="text-xs text-neutral-600 hover:text-maroon-700"
                        >
                          Save for later
                        </button>
                        <button
                          onClick={() => updateQuantity(item.id, 0)}
                          disabled={updatingItems.has(item.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Promo Code */}
              <div className="border-t pt-4">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-neutral-700 hover:text-maroon-700">
                    Have a promo code?
                  </summary>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code"
                      disabled={promoApplied}
                      className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={applyPromoCode}
                      disabled={!promoCode || promoApplied}
                    >
                      Apply
                    </Button>
                  </div>
                  {promoApplied && (
                    <p className="mt-2 text-xs text-green-600">
                      ✓ SAVE10 code applied - 10% off
                    </p>
                  )}
                </details>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                icon={
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                }
                title="Your cart is empty"
                description="Add items to get started"
                action={
                  <Button variant="primary" onClick={onClose}>
                    Continue Shopping
                  </Button>
                }
              />
            </div>
          )}
        </div>

        {/* Cart Summary & Actions */}
        {cart && cart.items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {/* Price Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              
              {promoApplied && (
                <div className="flex justify-between text-green-600">
                  <span>Discount (10%)</span>
                  <span>-{formatNaira(discount)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-neutral-600">Shipping</span>
                <span className={shipping === 0 ? 'text-green-600' : ''}>
                  {shipping === 0 ? 'FREE' : formatNaira(shipping)}
                </span>
              </div>
              
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span className="text-maroon-700">{formatNaira(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Link href="/checkout" onClick={onClose}>
                <Button variant="primary" className="w-full">
                  Proceed to Checkout
                </Button>
              </Link>
              <Link href="/cart" onClick={onClose}>
                <Button variant="secondary" className="w-full">
                  View Full Cart
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex justify-center gap-4 pt-2">
              <div className="flex items-center gap-1 text-xs text-neutral-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure
              </div>
              <div className="flex items-center gap-1 text-xs text-neutral-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Guaranteed
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}
