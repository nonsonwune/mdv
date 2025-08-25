"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Modal } from "../ui"
import { useCart } from "../../hooks/useCart"
import { formatNaira } from "../../lib/format"
import type { Product, Variant } from "../../lib/types"

interface ProductQuickViewProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export default function ProductQuickView({ product, isOpen, onClose }: ProductQuickViewProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { addToCart } = useCart()

  useEffect(() => {
    if (product?.variants?.[0]) {
      setSelectedVariant(product.variants[0])
    }
    setSelectedImage(0)
    setQuantity(1)
  }, [product])

  if (!product) return null

  const handleAddToCart = async () => {
    if (!selectedVariant) return
    
    setIsAddingToCart(true)
    try {
      await addToCart(selectedVariant.id, quantity)
      // Show success state briefly
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      console.error("Failed to add to cart:", error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const primaryImage = product.images?.[selectedImage] || product.images?.[0]
  const displayPrice = selectedVariant?.price || product.variants?.[0]?.price || 0
  const hasDiscount = product.compare_at_price && product.compare_at_price > displayPrice
  const discountPercentage = hasDiscount 
    ? Math.round((1 - displayPrice / (product.compare_at_price || displayPrice)) * 100)
    : 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      closeOnOverlayClick={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
        {/* Images Section */}
        <div>
          {/* Main Image */}
          <div className="relative aspect-square bg-neutral-100 rounded-lg overflow-hidden mb-4">
            {primaryImage?.url ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt_text || product.title || "Product image"}
                width={primaryImage.width ?? 600}
                height={primaryImage.height ?? 600}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-neutral-400">No image available</span>
              </div>
            )}
            
            {hasDiscount && (
              <div className="absolute top-2 left-2 bg-maroon-700 text-white px-2 py-1 rounded text-sm font-medium">
                -{discountPercentage}%
              </div>
            )}
          </div>

          {/* Thumbnail Images */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((img, index) => (
                img.url ? (
                  <button
                    key={img.id || index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index 
                        ? "border-maroon-700" 
                        : "border-transparent hover:border-neutral-300"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt_text || `${product.title} ${index + 1}`}
                      width={img.width ?? 150}
                      height={img.height ?? 150}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : null
              ))}
            </div>
          )}
        </div>

        {/* Product Details Section */}
        <div className="flex flex-col">
          {/* Title and Price */}
          <div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--ink-800)" }}>
              {product.title}
            </h2>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl font-bold" style={{ color: "var(--maroon-700)" }}>
                {formatNaira(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="text-lg line-through" style={{ color: "var(--ink-500)" }}>
                  {formatNaira(product.compare_at_price || 0)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm mb-4" style={{ color: "var(--ink-600)" }}>
                {product.description}
              </p>
            )}
          </div>

          {/* Variant Selection */}
          {product.variants && product.variants.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-700)" }}>
                Select Option
              </label>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((variant) => {
                  const variantLabel = [variant.size, variant.color]
                    .filter(Boolean)
                    .join(" / ") || variant.sku || `Option ${variant.id}`
                  
                  return variant.id ? (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-3 py-2 border rounded-lg text-sm transition-all ${
                        selectedVariant?.id === variant.id
                          ? "border-maroon-700 bg-maroon-50 text-maroon-700"
                          : "border-neutral-300 hover:border-maroon-500"
                      }`}
                    >
                      <div>{variantLabel}</div>
                      {variant.price !== displayPrice && (
                        <div className="text-xs mt-1">
                          {formatNaira(variant.price)}
                        </div>
                      )}
                    </button>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-700)" }}>
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg border border-neutral-300 hover:border-maroon-500 transition-colors"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 h-10 text-center border border-neutral-300 rounded-lg"
                min="1"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg border border-neutral-300 hover:border-maroon-500 transition-colors"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-auto pt-4">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || isAddingToCart}
              className="flex-1 px-6 py-3 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingToCart ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Adding...
                </span>
              ) : (
                "Add to Cart"
              )}
            </button>
            
            <Link
              href={`/product/${product.slug || product.id}`}
              onClick={onClose}
              className="px-6 py-3 border border-maroon-700 text-maroon-700 rounded-lg hover:bg-maroon-50 transition-colors text-center"
            >
              View Details
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--ink-200)" }}>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--ink-600)" }}>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>In Stock</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Authentic Product</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Fast Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
