"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Product, Variant } from "../../lib/types"
import { addItemWithRecovery } from "../../lib/cart"
import { Button, Badge } from "../ui"
import { useToast } from "../../app/_components/ToastProvider"
import ProductQuickView from "./ProductQuickView"

interface ProductCardProps {
  product: Product
  priority?: boolean
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const [showQuickView, setShowQuickView] = useState(false)
  const router = useRouter()
  const toast = useToast()
  
  const defaultVariant: Variant | undefined = product.variants?.[0]
  const price = defaultVariant?.price || 0
  const comparePrice = product.compare_at_price
  const isOnSale = comparePrice && comparePrice > price
  const discountPercent = isOnSale ? Math.round((1 - price / comparePrice) * 100) : 0
  
  // Get real stock status from product data
  const stockStatus = product.stock_status || "in-stock"
  const totalStock = product.total_stock || 0

  // Calculate stock count for low stock display
  const stockCount = stockStatus === "low-stock" && totalStock > 0 ? totalStock : null
  
  // Handle quick add to cart
  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!defaultVariant || stockStatus === "out_of_stock") return
    
    setIsAdding(true)
    try {
      await addItemWithRecovery(defaultVariant.id, 1)
      toast.success("Added to cart", `${product.title} has been added to your cart`)
      
      // Store in recently viewed
      const recentlyViewed = JSON.parse(localStorage.getItem("mdv_recently_viewed") || "[]")
      const filtered = recentlyViewed.filter((p: Product) => p.id !== product.id)
      filtered.unshift(product)
      localStorage.setItem("mdv_recently_viewed", JSON.stringify(filtered.slice(0, 10)))
    } catch (error) {
      toast.error("Failed to add to cart", "Please try again")
      console.error("Quick add error:", error)
    } finally {
      setIsAdding(false)
    }
  }
  
  // Cycle through images on hover (if multiple images exist)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!product.images || product.images.length <= 1) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    const segment = width / product.images.length
    const index = Math.floor(x / segment)
    
    setImageIndex(Math.min(index, product.images.length - 1))
  }
  
  const currentImage = product.images?.[imageIndex] || product.images?.[0]
  
  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setImageIndex(0)
      }}
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden rounded-lg bg-neutral-100">
          {/* Sale Badge */}
          {isOnSale && (
            <Badge
              variant="danger"
              className="absolute top-2 left-2 z-10"
            >
              -{discountPercent}%
            </Badge>
          )}
          
          {/* Stock Badge */}
          {stockStatus === "out_of_stock" && (
            <Badge
              variant="neutral"
              className="absolute top-2 right-2 z-10"
            >
              Out of Stock
            </Badge>
          )}
          {stockStatus === "low_stock" && stockCount && stockCount > 0 && (
            <Badge
              variant="warning"
              className="absolute top-2 right-2 z-10"
            >
              Only {stockCount} left
            </Badge>
          )}
          
          {/* Product Image */}
          <div 
            className="relative aspect-square"
            onMouseMove={handleMouseMove}
          >
            {currentImage?.url ? (
              <Image
                src={currentImage.url}
                alt={currentImage.alt_text || product.title}
                width={currentImage.width ?? 400}
                height={currentImage.height ?? 400}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  isHovered ? "scale-105" : ""
                }`}
                priority={priority}
              />
            ) : (
              <div className="w-full h-full bg-neutral-200" />
            )}
            
            {/* Image dots indicator */}
            {product.images && product.images.length > 1 && isHovered && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {product.images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      idx === imageIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Quick Actions Overlay */}
          <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowQuickView(true)
                }}
                className="flex-1 px-3 py-2 bg-white text-black rounded-lg hover:bg-neutral-100 transition-colors text-sm font-medium"
                aria-label="Quick view"
              >
                Quick View
              </button>
              <button
                onClick={handleQuickAdd}
                disabled={isAdding || stockStatus === "out_of_stock"}
                className="p-2 bg-white rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50"
                aria-label="Add to cart"
              >
                {isAdding ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Add to wishlist
                  const wishlist = JSON.parse(localStorage.getItem("mdv_wishlist") || "[]")
                  const exists = wishlist.find((p: Product) => p.id === product.id)
                  if (!exists) {
                    wishlist.push(product)
                    localStorage.setItem("mdv_wishlist", JSON.stringify(wishlist))
                    toast.success("Added to wishlist")
                  } else {
                    toast.info("Already in wishlist")
                  }
                }}
                className="p-2 bg-white rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Add to wishlist"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Product Info */}
        <div className="mt-3">
          <h3 className="text-sm font-medium text-neutral-900 group-hover:text-maroon-700 transition-colors line-clamp-2">
            {product.title}
          </h3>
          
          {/* Variant Options Preview */}
          {product.variants && product.variants.length > 1 && (
            <div className="mt-1 flex gap-1">
              {product.variants.slice(0, 4).map((variant, idx) => (
                <div
                  key={variant.id}
                  className="w-4 h-4 rounded-full border border-neutral-300"
                  style={{
                    background: variant.color ? 
                      variant.color.toLowerCase() : 
                      `hsl(${idx * 60}, 50%, 50%)`
                  }}
                  title={`${variant.size || ""} ${variant.color || ""}`.trim()}
                />
              ))}
              {product.variants.length > 4 && (
                <span className="text-xs text-neutral-500">+{product.variants.length - 4}</span>
              )}
            </div>
          )}
          
          {/* Price */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-semibold">
              ₦{price.toLocaleString()}
            </span>
            {isOnSale && (
              <span className="text-sm text-neutral-500 line-through">
                ₦{comparePrice.toLocaleString()}
              </span>
            )}
          </div>
          
          {/* Rating */}
          <div className="mt-1 flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i < Math.floor(product.average_rating || 0) ? "text-yellow-400 fill-current" : "text-neutral-300"}`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-neutral-600">
              ({product.review_count || 0})
            </span>
          </div>
        </div>
      </Link>
      
      {/* Quick View Modal */}
      <ProductQuickView
        product={product}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
      />
    </div>
  )
}
