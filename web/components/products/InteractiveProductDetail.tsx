'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product, ProductImage, Variant } from '@/lib/types'

interface InteractiveProductDetailProps {
  product: Product
}

export default function InteractiveProductDetail({ product }: InteractiveProductDetailProps) {
  // State for selected variant
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    product.variants?.[0]?.id || 0
  )
  
  // State for main image index (for thumbnail navigation)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  
  // Get currently selected variant
  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId) || product.variants?.[0]
  
  // Get images to display (variant-specific or product-level)
  const getDisplayImages = (): ProductImage[] => {
    if (!selectedVariant) {
      // No variant selected, show product-level images only
      return product.images?.filter(img => !img.variant_id) || []
    }

    // Get variant-specific images for the selected variant
    const variantImages = product.images?.filter(img => img.variant_id === selectedVariant.id) || []

    if (variantImages.length > 0) {
      // Show variant-specific images if available
      return variantImages
    }

    // Fallback to product-level images (excluding variant-specific ones)
    return product.images?.filter(img => !img.variant_id) || []
  }
  
  const displayImages = getDisplayImages()
  const mainImage = displayImages[selectedImageIndex] || displayImages[0]
  
  // Reset image index when variant changes
  useEffect(() => {
    setSelectedImageIndex(0)
  }, [selectedVariantId])
  
  // Handle variant selection
  const handleVariantChange = (variantId: number) => {
    setSelectedVariantId(variantId)
  }
  
  // Handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    setSelectedImageIndex(index)
  }
  
  // Calculate discount percentage
  const getDiscountPercentage = () => {
    if (!selectedVariant?.price || !product.compare_at_price) return null
    if (Number(product.compare_at_price) <= Number(selectedVariant.price)) return null
    
    return Math.round((1 - Number(selectedVariant.price) / Number(product.compare_at_price)) * 100)
  }
  
  const discountPercentage = getDiscountPercentage()

  // Touch gesture handlers for mobile image swiping
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && selectedImageIndex < displayImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
    if (isRightSwipe && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10">
      <Link href="/" className="inline-flex items-center text-sm text-maroon-700 hover:text-maroon-800 transition-colors mb-4 md:mb-6">
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Image Section */}
        <div className="order-1">
          {/* Main Image with Touch Support */}
          <div
            className="relative overflow-hidden rounded-lg bg-neutral-100 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {mainImage?.url ? (
              <Image
                src={mainImage.url}
                alt={mainImage.alt_text || product.title || "Product image"}
                width={mainImage.width ?? 1000}
                height={mainImage.height ?? 1000}
                className="w-full aspect-square object-cover transition-all duration-300 select-none"
                priority
                draggable={false}
              />
            ) : (
              <div className="aspect-square bg-neutral-100 flex items-center justify-center">
                <span className="text-neutral-400">No image available</span>
              </div>
            )}

            {/* Image counter and navigation */}
            {displayImages.length > 1 && (
              <>
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                  {selectedImageIndex + 1} / {displayImages.length}
                </div>

                {/* Mobile swipe indicators */}
                <div className="md:hidden absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {displayImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Desktop navigation arrows */}
                <div className="hidden md:block">
                  {selectedImageIndex > 0 && (
                    <button
                      onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200"
                      aria-label="Previous image"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}

                  {selectedImageIndex < displayImages.length - 1 && (
                    <button
                      onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200"
                      aria-label="Next image"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Thumbnail Grid - Hidden on mobile, shown on desktop */}
          {displayImages.length > 1 && (
            <div className="hidden md:grid mt-4 grid-cols-4 gap-2">
              {displayImages.slice(0, 8).map((img, index) => (
                img.url && img.id ? (
                  <button
                    key={img.id}
                    onClick={() => handleThumbnailClick(index)}
                    className={`relative overflow-hidden rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] ${
                      index === selectedImageIndex
                        ? 'ring-2 ring-maroon-600 ring-offset-2'
                        : 'hover:ring-2 hover:ring-neutral-300 hover:ring-offset-1'
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt_text || product.title || "Product image"}
                      width={img.width ?? 300}
                      height={img.height ?? 300}
                      className="w-full aspect-square object-cover"
                    />
                  </button>
                ) : null
              ))}
            </div>
          )}

          {/* Mobile swipe hint */}
          {displayImages.length > 1 && (
            <div className="md:hidden mt-3 text-center">
              <p className="text-xs text-neutral-500 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Swipe to view more images
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </p>
            </div>
          )}
        </div>
        
        {/* Product Info Section */}
        <div className="order-2 md:order-2">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold leading-tight" style={{ color: "var(--ink-700)" }}>
            {product.title}
          </h1>

          {/* Price Display */}
          {selectedVariant && (
            <div className="mt-3 md:mt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl md:text-3xl font-bold text-maroon-700">
                  ₦{Number(selectedVariant.price || 0).toLocaleString()}
                </span>

                {product.compare_at_price && discountPercentage && (
                  <>
                    <span className="line-through text-neutral-500 text-lg md:text-xl">
                      ₦{Number(product.compare_at_price).toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold bg-maroon-700 text-white rounded-full px-3 py-1">
                      -{discountPercentage}%
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Stock Status */}
          {selectedVariant && (
            <div className="mt-3 md:mt-4">
              {selectedVariant.stock_quantity && selectedVariant.stock_quantity > 0 ? (
                <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">
                    In stock ({selectedVariant.stock_quantity} available)
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm font-medium">Out of stock</span>
                </div>
              )}
            </div>
          )}
          
          {/* Variant Selection Form */}
          <form className="mt-6 md:mt-8" action="/cart" method="GET">
            {product.variants?.length && product.variants.length > 1 ? (
              <div className="mb-6">
                <label className="block text-base font-medium mb-3" style={{ color: "var(--ink-600)" }}>
                  Choose variant:
                </label>
                <select
                  name="add"
                  value={selectedVariantId}
                  onChange={(e) => handleVariantChange(Number(e.target.value))}
                  className="w-full border-2 border-neutral-300 p-4 rounded-lg text-base focus:ring-2 focus:ring-maroon-600 focus:border-maroon-600 transition-all duration-200 bg-white min-h-[48px]"
                >
                  {product.variants.map((variant) => (
                    variant.id ? (
                      <option key={variant.id} value={variant.id}>
                        {[variant.size, variant.color].filter(Boolean).join(" / ") || variant.sku || `Variant ${variant.id}`}
                        {variant.price ? ` - ₦${Number(variant.price).toLocaleString()}` : ''}
                      </option>
                    ) : null
                  ))}
                </select>
              </div>
            ) : (
              product.variants?.[0] ? <input type="hidden" name="add" value={product.variants[0].id} /> : null
            )}

            {/* Add to Cart Section - Mobile Optimized */}
            <div className="sticky bottom-0 md:relative md:bottom-auto bg-white md:bg-transparent border-t md:border-t-0 border-neutral-200 md:border-none p-4 md:p-0 -mx-4 md:mx-0 mt-6 md:mt-4 shadow-lg md:shadow-none backdrop-blur-sm md:backdrop-blur-none safe-area-inset">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <button
                  type="submit"
                  disabled={!selectedVariant?.stock_quantity || selectedVariant.stock_quantity <= 0}
                  className="w-full md:flex-1 bg-maroon-700 hover:bg-maroon-800 active:bg-maroon-900 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white font-semibold py-4 md:py-3 px-6 rounded-lg md:rounded-md transition-all duration-200 min-h-[48px] text-base md:text-sm shadow-sm hover:shadow-md active:shadow-sm transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
                >
                  {selectedVariant?.stock_quantity && selectedVariant.stock_quantity > 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      Add to Cart
                    </span>
                  ) : (
                    'Out of Stock'
                  )}
                </button>

                <Link
                  href="/cart"
                  className="md:w-auto text-center md:text-left text-sm text-maroon-700 hover:text-maroon-800 underline transition-colors duration-200 py-2 md:py-0 min-h-[44px] flex items-center justify-center md:justify-start"
                >
                  View Cart
                </Link>
              </div>
            </div>
          </form>
          
          {/* Product Description */}
          {product.description && (
            <div className="mt-6 md:mt-8 p-4 md:p-6 bg-neutral-50 rounded-lg">
              <h3 className="text-base md:text-lg font-semibold mb-3" style={{ color: "var(--ink-700)" }}>
                Description
              </h3>
              <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ink-600)" }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Variant Details */}
          {selectedVariant && (
            <div className="mt-4 md:mt-6 p-4 md:p-6 bg-neutral-50 rounded-lg">
              <h3 className="text-base md:text-lg font-semibold mb-3" style={{ color: "var(--ink-700)" }}>
                Product Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm md:text-base" style={{ color: "var(--ink-600)" }}>
                {selectedVariant.sku && (
                  <div className="flex justify-between md:block">
                    <span className="font-medium">SKU:</span>
                    <span className="font-mono text-neutral-700">{selectedVariant.sku}</span>
                  </div>
                )}
                {selectedVariant.size && (
                  <div className="flex justify-between md:block">
                    <span className="font-medium">Size:</span>
                    <span className="font-semibold text-maroon-700">{selectedVariant.size}</span>
                  </div>
                )}
                {selectedVariant.color && (
                  <div className="flex justify-between md:block">
                    <span className="font-medium">Color:</span>
                    <span className="font-semibold text-maroon-700">{selectedVariant.color}</span>
                  </div>
                )}
                {selectedVariant.stock_quantity && (
                  <div className="flex justify-between md:block">
                    <span className="font-medium">Available:</span>
                    <span className="font-semibold text-green-600">{selectedVariant.stock_quantity} units</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
