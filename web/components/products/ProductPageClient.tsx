"use client"

import { useEffect } from 'react'
import ProductViewTracker from './ProductViewTracker'
import type { Product } from '../../lib/types'

interface ProductPageClientProps {
  product: Product
  children: React.ReactNode
}

/**
 * ProductPageClient Component
 * 
 * Client-side wrapper for product pages that handles:
 * - Product view tracking for recently viewed
 * - Client-side interactions
 * - Analytics tracking (future)
 * 
 * This component wraps the server-side product page content
 * and adds client-side functionality.
 */
export default function ProductPageClient({ product, children }: ProductPageClientProps) {
  // Track page view for analytics (future enhancement)
  useEffect(() => {
    // This could be extended to include analytics tracking
    console.log(`Product page viewed: ${product.title}`)
  }, [product])

  return (
    <>
      {/* Track product view for recently viewed */}
      <ProductViewTracker product={product} delay={2000} />
      
      {/* Render the server-side content */}
      {children}
    </>
  )
}
