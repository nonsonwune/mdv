"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { api } from "../../lib/api-client"
import type { Product } from "../../lib/types"

interface RandomFeaturedProductProps {
  className?: string
}

export default function RandomFeaturedProduct({ className = "" }: RandomFeaturedProductProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRandomProduct()
  }, [])

  const loadRandomProduct = async () => {
    try {
      // Fetch products and select a random one
      const response = await api<{ items: Product[] }>('/api/products?page=1&page_size=20')
      const products = response.items || []
      
      if (products.length > 0) {
        // Select a random product
        const randomIndex = Math.floor(Math.random() * products.length)
        setProduct(products[randomIndex])
      }
    } catch (error) {
      console.error('Failed to load random product:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden ${className}`}>
        <div className="aspect-[4/5] bg-gradient-to-br from-neutral-100 to-neutral-200 animate-pulse">
          <div className="absolute top-6 right-6 bg-white rounded-xl shadow-lg p-4 animate-pulse">
            <div className="text-center">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-20 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-14"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden ${className}`}>
        <div className="aspect-[4/5] bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
          <div className="text-center text-neutral-500">
            <div className="w-24 h-24 mx-auto mb-4 bg-neutral-300 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-lg font-medium">No Products Available</p>
            <p className="text-sm">Check back soon for new arrivals</p>
          </div>
        </div>
      </div>
    )
  }

  const primaryImage = product.images?.[0]
  const primaryVariant = product.variants?.[0]
  const price = primaryVariant?.price || 0
  const compareAtPrice = product.compare_at_price

  return (
    <Link href={`/product/${product.slug}`} className={`block group ${className}`}>
      <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
        <div className="aspect-[4/5] relative">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt_text || product.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
              <div className="text-center text-neutral-400">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No Image</p>
              </div>
            </div>
          )}
          
          {/* Product Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
            <h3 className="text-white font-semibold text-lg mb-1 line-clamp-2">
              {product.title}
            </h3>
            {primaryVariant?.size && (
              <p className="text-white/80 text-sm">
                Size: {primaryVariant.size}
              </p>
            )}
          </div>
        </div>
        
        {/* Floating Price Tag */}
        <div className="absolute top-6 right-6 bg-white rounded-xl shadow-lg p-4 transition-transform duration-300 group-hover:scale-105">
          <div className="text-center">
            <div className="text-sm text-ink-600">Featured Product</div>
            <div className="text-2xl font-bold text-maroon-700">
              ₦{price.toLocaleString()}
            </div>
            {compareAtPrice && compareAtPrice > price && (
              <div className="text-xs text-success">
                Save ₦{(compareAtPrice - price).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-maroon-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white rounded-full px-6 py-3 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <span className="text-maroon-700 font-semibold">View Product</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
