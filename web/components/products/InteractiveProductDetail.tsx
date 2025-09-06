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
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      // Show variant-specific images if available
      return selectedVariant.images
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm underline">← Back</Link>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Image Section */}
        <div>
          {/* Main Image */}
          <div className="relative overflow-hidden rounded bg-neutral-100">
            {mainImage?.url ? (
              <Image 
                src={mainImage.url} 
                alt={mainImage.alt_text || product.title || "Product image"} 
                width={mainImage.width ?? 1000} 
                height={mainImage.height ?? 1000} 
                className="w-full aspect-square object-cover transition-opacity duration-300" 
                priority
              />
            ) : (
              <div className="aspect-square bg-neutral-100 flex items-center justify-center">
                <span className="text-neutral-400">No image available</span>
              </div>
            )}
            
            {/* Image counter */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {selectedImageIndex + 1} / {displayImages.length}
              </div>
            )}
          </div>
          
          {/* Thumbnail Grid */}
          {displayImages.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {displayImages.slice(0, 8).map((img, index) => (
                img.url && img.id ? (
                  <button
                    key={img.id}
                    onClick={() => handleThumbnailClick(index)}
                    className={`relative overflow-hidden rounded transition-all duration-200 ${
                      index === selectedImageIndex 
                        ? 'ring-2 ring-maroon-600 ring-offset-2' 
                        : 'hover:ring-2 hover:ring-neutral-300 hover:ring-offset-1'
                    }`}
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
        </div>
        
        {/* Product Info Section */}
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>
            {product.title}
          </h1>
          
          {/* Price Display */}
          {selectedVariant && (
            <div className="mt-2 text-base flex items-center gap-2">
              <span className="text-xl font-semibold text-maroon-700">
                ₦{Number(selectedVariant.price || 0).toLocaleString()}
              </span>
              
              {product.compare_at_price && discountPercentage && (
                <>
                  <span className="line-through text-neutral-500 text-sm">
                    ₦{Number(product.compare_at_price).toLocaleString()}
                  </span>
                  <span className="text-xs bg-maroon-700 text-white rounded px-2 py-0.5">
                    -{discountPercentage}%
                  </span>
                </>
              )}
            </div>
          )}
          
          {/* Stock Status */}
          {selectedVariant && (
            <div className="mt-2">
              {selectedVariant.stock_quantity && selectedVariant.stock_quantity > 0 ? (
                <span className="text-sm text-green-600">
                  ✓ In stock ({selectedVariant.stock_quantity} available)
                </span>
              ) : (
                <span className="text-sm text-red-600">
                  ✗ Out of stock
                </span>
              )}
            </div>
          )}
          
          {/* Variant Selection Form */}
          <form className="mt-6" action="/cart" method="GET">
            {product.variants?.length && product.variants.length > 1 ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-600)" }}>
                  Choose variant:
                </label>
                <select 
                  name="add" 
                  value={selectedVariantId}
                  onChange={(e) => handleVariantChange(Number(e.target.value))}
                  className="w-full border border-neutral-300 p-3 rounded-md focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200"
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
            
            {/* Add to Cart Section */}
            <div className="sticky bottom-4 flex items-center gap-3 bg-white/90 backdrop-blur-sm mt-4 p-4 rounded-lg border border-neutral-200 shadow-lg">
              <button 
                type="submit" 
                disabled={!selectedVariant?.stock_quantity || selectedVariant.stock_quantity <= 0}
                className="flex-1 bg-maroon-700 hover:bg-maroon-800 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
              >
                {selectedVariant?.stock_quantity && selectedVariant.stock_quantity > 0 
                  ? 'Add to Cart' 
                  : 'Out of Stock'
                }
              </button>
              <Link 
                href="/cart" 
                className="text-sm text-maroon-700 hover:text-maroon-800 underline transition-colors duration-200"
              >
                Go to cart
              </Link>
            </div>
          </form>
          
          {/* Product Description */}
          {product.description && (
            <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--ink-700)" }}>
                Description
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-600)" }}>
                {product.description}
              </p>
            </div>
          )}
          
          {/* Variant Details */}
          {selectedVariant && (
            <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--ink-700)" }}>
                Variant Details
              </h3>
              <div className="space-y-1 text-sm" style={{ color: "var(--ink-600)" }}>
                {selectedVariant.sku && (
                  <div>SKU: <span className="font-mono">{selectedVariant.sku}</span></div>
                )}
                {selectedVariant.size && (
                  <div>Size: <span className="font-medium">{selectedVariant.size}</span></div>
                )}
                {selectedVariant.color && (
                  <div>Color: <span className="font-medium">{selectedVariant.color}</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
