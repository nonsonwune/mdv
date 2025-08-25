"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useWishlist } from '../../hooks/useWishlist'
import { Button, Card, EmptyState } from '../ui'
import { formatNaira } from '../../lib/format'
import { useToast } from '../../app/_components/ToastProvider'

export default function WishlistPage() {
  const { items, removeItem, moveToCart, clearWishlist } = useWishlist()
  const toast = useToast()
  const [movingToCart, setMovingToCart] = useState<number | null>(null)
  const [isClearing, setIsClearing] = useState(false)

  const handleMoveToCart = async (productId: number) => {
    setMovingToCart(productId)
    try {
      const success = await moveToCart(productId)
      if (success) {
        toast.success('Added to cart', 'Item moved from wishlist to cart')
      } else {
        toast.error('Failed to add to cart', 'Please try again')
      }
    } catch (error) {
      toast.error('Error', 'Something went wrong')
    } finally {
      setMovingToCart(null)
    }
  }

  const handleRemove = (productId: number, productTitle: string) => {
    removeItem(productId)
    toast.info('Removed from wishlist', `${productTitle} has been removed`)
  }

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
      setIsClearing(true)
      clearWishlist()
      toast.info('Wishlist cleared', 'All items have been removed')
      setTimeout(() => setIsClearing(false), 500)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <EmptyState
          icon={
            <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
          title="Your wishlist is empty"
          description="Save items you love to your wishlist and shop them anytime"
          action={
            <Link href="/women">
              <Button variant="primary">Start Shopping</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
          <p className="text-neutral-600">
            {items.length} {items.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
        
        {items.length > 0 && (
          <Button
            variant="secondary"
            onClick={handleClearAll}
            disabled={isClearing}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(product => {
          const price = product.variants?.[0]?.price || 0
          const comparePrice = product.compare_at_price
          const isOnSale = comparePrice && comparePrice > price
          const image = product.images?.[0]
          
          return (
            <Card key={product.id} className="overflow-hidden group">
              {/* Product Image */}
              <Link href={`/product/${product.slug}`}>
                <div className="relative aspect-square bg-neutral-100">
                  {image?.url ? (
                    <Image
                      src={image.url}
                      alt={image.alt_text || product.title}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-200" />
                  )}
                  
                  {isOnSale && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                      Sale
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleRemove(product.id, product.title)
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </Link>
              
              {/* Product Info */}
              <div className="p-4">
                <Link href={`/product/${product.slug}`}>
                  <h3 className="font-medium mb-2 hover:text-maroon-700 transition-colors line-clamp-2">
                    {product.title}
                  </h3>
                </Link>
                
                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-bold text-maroon-700">
                    {formatNaira(price)}
                  </span>
                  {isOnSale && (
                    <span className="text-sm text-neutral-500 line-through">
                      {formatNaira(comparePrice)}
                    </span>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleMoveToCart(product.id)}
                    disabled={movingToCart === product.id}
                    loading={movingToCart === product.id}
                  >
                    Add to Cart
                  </Button>
                  <Link href={`/product/${product.slug}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Share Wishlist Section */}
      <div className="mt-12 p-6 bg-neutral-50 rounded-lg text-center">
        <h2 className="text-xl font-semibold mb-2">Share Your Wishlist</h2>
        <p className="text-neutral-600 mb-4">
          Let friends and family know what you're loving
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              // In a real app, this would generate a shareable link
              navigator.clipboard.writeText(window.location.href)
              toast.success('Link copied!', 'Wishlist link copied to clipboard')
            }}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Copy Link
          </button>
          <button
            onClick={() => {
              // In a real app, this would open WhatsApp with a pre-filled message
              const text = `Check out my wishlist on MDV: ${window.location.href}`
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1.01 1.01 0 0 0 3.8 21.454l3.032-.892A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.592 0-3.138-.467-4.469-1.35l-.321-.213-3.332.874.894-3.264-.216-.344A7.957 7.957 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
            </svg>
            Share on WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
