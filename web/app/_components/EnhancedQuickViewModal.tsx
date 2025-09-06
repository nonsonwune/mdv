"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { API_BASE } from "../../lib/api"
import type { Product, Variant } from "../../lib/types"
import Image from "next/image"
import { XMarkIcon, HeartIcon, ShareIcon, StarIcon, CheckIcon } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid"

export default function EnhancedQuickViewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/${slug}`, { cache: "no-store" })
        if (res.ok) {
          const productData = await res.json()
          setProduct(productData)
          setSelectedVariant(productData.variants?.[0] || null)
        }
      } finally { setLoading(false) }
    })()
  }, [slug])

  const handleAddToCart = async () => {
    if (!selectedVariant) return
    
    setIsAddingToCart(true)
    try {
      // Navigate to cart with add parameter
      window.location.href = `/cart?add=${selectedVariant.id}`
      setAddedToCart(true)
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error("Failed to add to cart:", error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const displayPrice = selectedVariant?.price || product?.variants?.[0]?.price || 0
  const hasDiscount = product?.compare_at_price && product.compare_at_price > displayPrice
  const discountPercentage = hasDiscount 
    ? Math.round((1 - displayPrice / (product.compare_at_price || displayPrice)) * 100)
    : 0

  const currentImage = product?.images?.[selectedImageIndex] || product?.images?.[0]

  // Get stock status
  const stockStatus = selectedVariant?.inventory_quantity || 0
  const isInStock = stockStatus > 0
  const isLowStock = stockStatus > 0 && stockStatus <= 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 rounded-full bg-maroon-700"></div>
            <h2 className="text-base sm:text-lg font-semibold text-ink-700">Quick View</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsWishlisted(!isWishlisted)}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors duration-200"
              aria-label="Add to wishlist"
            >
              {isWishlisted ? (
                <HeartSolidIcon className="w-5 h-5 text-maroon-700" />
              ) : (
                <HeartIcon className="w-5 h-5 text-ink-600" />
              )}
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors duration-200"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5 text-ink-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-80px)] sm:max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="w-full aspect-square bg-neutral-200 rounded-xl" />
                  <div className="flex gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-16 h-16 bg-neutral-200 rounded-lg" />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-8 bg-neutral-200 rounded w-3/4" />
                  <div className="h-6 bg-neutral-200 rounded w-1/2" />
                  <div className="h-20 bg-neutral-200 rounded" />
                  <div className="h-12 bg-neutral-200 rounded" />
                </div>
              </div>
            </div>
          ) : !product ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                <XMarkIcon className="w-8 h-8 text-neutral-400" />
              </div>
              <p className="text-ink-600">Failed to load product details.</p>
              <button 
                onClick={onClose}
                className="mt-4 btn-secondary"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Image Gallery */}
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative group">
                  {currentImage?.url ? (
                    <Image 
                      src={currentImage.url} 
                      alt={currentImage.alt_text || product.title} 
                      width={currentImage.width ?? 600} 
                      height={currentImage.height ?? 600} 
                      className="w-full aspect-square object-cover rounded-xl bg-neutral-100 transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full aspect-square bg-neutral-100 rounded-xl flex items-center justify-center">
                      <div className="text-neutral-400 text-center">
                        <div className="w-16 h-16 mx-auto mb-2 bg-neutral-200 rounded-full"></div>
                        <p className="text-sm">No image available</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-4 left-4 bg-maroon-700 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                      -{discountPercentage}%
                    </div>
                  )}

                  {/* Stock Badge */}
                  <div className="absolute top-4 right-4">
                    {isInStock ? (
                      <div className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg ${
                        isLowStock 
                          ? 'bg-warning text-white' 
                          : 'bg-success text-white'
                      }`}>
                        {isLowStock ? `Only ${stockStatus} left` : 'In Stock'}
                      </div>
                    ) : (
                      <div className="bg-neutral-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        Out of Stock
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnail Gallery */}
                {product.images && product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          selectedImageIndex === index 
                            ? 'border-maroon-700 ring-2 ring-maroon-200' 
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <Image 
                          src={image.url} 
                          alt={image.alt_text || `${product.title} ${index + 1}`}
                          width={64} 
                          height={64} 
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="space-y-6">
                {/* Title and Rating */}
                <div>
                  <h1 className="text-2xl font-bold text-ink-700 mb-2">{product.title}</h1>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm text-ink-600">(4.8) • 124 reviews</span>
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-ink-700">
                      ₦{displayPrice.toLocaleString()}
                    </span>
                    {hasDiscount && (
                      <span className="text-lg text-neutral-500 line-through">
                        ₦{(product.compare_at_price || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {hasDiscount && (
                    <div className="text-sm text-success font-medium">
                      You save ₦{((product.compare_at_price || 0) - displayPrice).toLocaleString()} ({discountPercentage}% off)
                    </div>
                  )}
                </div>

                {/* Variant Selection */}
                {product.variants && product.variants.length > 1 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-ink-700">Choose Variant:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={`p-3 border rounded-lg text-sm transition-all duration-200 ${
                            selectedVariant?.id === variant.id
                              ? 'border-maroon-700 bg-maroon-50 text-maroon-700'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="font-medium">{variant.size} • {variant.color}</div>
                          <div className="text-xs text-ink-600">₦{(variant.price || 0).toLocaleString()}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity and Add to Cart */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-neutral-300 rounded-lg">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 hover:bg-neutral-100 transition-colors duration-200"
                      >
                        -
                      </button>
                      <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-2 hover:bg-neutral-100 transition-colors duration-200"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm text-ink-600">
                      {stockStatus} available
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={!isInStock || isAddingToCart || addedToCart}
                      className={`flex-1 btn-primary flex items-center justify-center gap-2 ${
                        addedToCart ? 'bg-success hover:bg-success' : ''
                      }`}
                    >
                      {isAddingToCart ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Adding...
                        </>
                      ) : addedToCart ? (
                        <>
                          <CheckIcon className="w-4 h-4" />
                          Added to Cart
                        </>
                      ) : (
                        'Add to Cart'
                      )}
                    </button>
                    <Link 
                      href={`/product/${product.slug}`}
                      className="btn-secondary px-6"
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Product Description */}
                {product.description && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-ink-700">Description</h3>
                    <p className="text-sm text-ink-600 leading-relaxed">
                      {product.description.length > 150 
                        ? `${product.description.substring(0, 150)}...` 
                        : product.description
                      }
                    </p>
                  </div>
                )}

                {/* Features */}
                <div className="space-y-2">
                  <h3 className="font-medium text-ink-700">Features</h3>
                  <ul className="space-y-1 text-sm text-ink-600">
                    <li className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4 text-success" />
                      Free shipping on orders over ₦50,000
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4 text-success" />
                      30-day return policy
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4 text-success" />
                      Authentic products guaranteed
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
