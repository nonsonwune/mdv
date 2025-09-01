'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWishlist } from '@/hooks/useWishlist'
import { useRouter } from 'next/navigation'
import { 
  HeartIcon, 
  ShoppingCartIcon, 
  TrashIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import Link from 'next/link'

export default function WishlistPage() {
  const { user, isAuthenticated } = useAuth()
  const { 
    items, 
    isLoading, 
    error, 
    removeItem, 
    clearWishlist, 
    moveToCart,
    loadWishlist 
  } = useWishlist()
  const router = useRouter()
  const [isClearing, setIsClearing] = useState(false)
  const [removingItems, setRemovingItems] = useState<Set<number>>(new Set())

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login?redirect=/account/wishlist')
    }
  }, [isAuthenticated, isLoading, router])

  const handleRemoveItem = async (productId: number, variantId?: number) => {
    setRemovingItems(prev => new Set(prev).add(productId))
    try {
      await removeItem(productId, variantId)
    } catch (error) {
      console.error('Failed to remove item:', error)
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  const handleMoveToCart = async (itemId: number) => {
    try {
      await moveToCart(itemId)
    } catch (error) {
      console.error('Failed to move to cart:', error)
    }
  }

  const handleClearWishlist = async () => {
    if (!confirm('Are you sure you want to clear your entire wishlist?')) {
      return
    }

    setIsClearing(true)
    try {
      await clearWishlist()
    } catch (error) {
      console.error('Failed to clear wishlist:', error)
    } finally {
      setIsClearing(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Wishlist</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={loadWishlist}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <HeartSolidIcon className="h-8 w-8 text-red-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-gray-600">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved for later
            </p>
          </div>
        </div>
        
        {items.length > 0 && (
          <button
            onClick={handleClearWishlist}
            disabled={isClearing}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            {isClearing ? 'Clearing...' : 'Clear All'}
          </button>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <HeartIcon className="mx-auto h-24 w-24 text-gray-300 mb-6" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-500 mb-6">
            Save items you love to your wishlist and shop them later.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        /* Wishlist Items Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={`${item.product_id}-${item.variant_id || 'default'}`} className="bg-white rounded-lg shadow-md overflow-hidden group">
              {/* Product Image */}
              <div className="relative aspect-square">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.product_name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
                
                {/* Stock Status */}
                {!item.in_stock && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                    Out of Stock
                  </div>
                )}
                
                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveItem(item.product_id, item.variant_id)}
                  disabled={removingItems.has(item.product_id)}
                  className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white/90 disabled:opacity-50"
                  title="Remove from wishlist"
                >
                  {removingItems.has(item.product_id) ? (
                    <div className="w-4 h-4 animate-spin border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  ) : (
                    <TrashIcon className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <Link 
                  href={`/products/${item.product_slug}`}
                  className="block hover:text-maroon-600"
                >
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {item.product_name}
                  </h3>
                </Link>
                
                <p className="text-lg font-bold text-gray-900 mb-3">
                  ₦{item.price.toLocaleString()}
                </p>
                
                <div className="text-xs text-gray-500 mb-3">
                  Added {new Date(item.added_at).toLocaleDateString()}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMoveToCart(item.id)}
                    disabled={!item.in_stock}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                  >
                    <ShoppingCartIcon className="w-4 h-4 mr-1" />
                    {item.in_stock ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                  
                  <Link
                    href={`/products/${item.product_slug}`}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wishlist Tips */}
      {items.length > 0 && (
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Wishlist Tips</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Items in your wishlist are saved across all your devices</li>
            <li>• You'll be notified if an item goes on sale (coming soon)</li>
            <li>• Share your wishlist with friends and family (coming soon)</li>
            <li>• Items may become unavailable - add them to cart to secure your purchase</li>
          </ul>
        </div>
      )}
    </div>
  )
}
