"use client"

import { useEffect } from 'react'
import { useRecentlyViewed } from './RecentlyViewed'
import type { Product } from '../../lib/types'

interface ProductViewTrackerProps {
  product: Product
  delay?: number // Delay before tracking (to avoid tracking quick bounces)
}

/**
 * ProductViewTracker Component
 * 
 * Tracks when a user views a product page and adds it to their recently viewed list.
 * Should be included on product pages to automatically track product views.
 * 
 * @param product - The product being viewed
 * @param delay - Delay in milliseconds before tracking (default: 2000ms)
 */
export default function ProductViewTracker({ product, delay = 2000 }: ProductViewTrackerProps) {
  const { addProduct } = useRecentlyViewed()

  useEffect(() => {
    // Validate product data before tracking
    if (!product || !product.id || !product.title || !product.slug) {
      console.warn('ProductViewTracker: Invalid product data provided')
      return
    }

    // Track the product view after a delay to avoid tracking quick bounces
    const timer = setTimeout(() => {
      try {
        addProduct(product)
        console.log(`Tracked product view: ${product.title}`)
      } catch (error) {
        console.error('Error tracking product view:', error)
      }
    }, delay)

    // Cleanup timer on unmount
    return () => clearTimeout(timer)
  }, [product, delay, addProduct])

  // This component doesn't render anything
  return null
}

/**
 * Hook for manually tracking product views
 * 
 * Use this when you need to track product views programmatically
 * rather than automatically on page load.
 */
export function useProductViewTracker() {
  const { addProduct } = useRecentlyViewed()

  const trackProductView = (product: Product) => {
    if (!product || !product.id || !product.title || !product.slug) {
      console.warn('useProductViewTracker: Invalid product data provided')
      return
    }

    try {
      addProduct(product)
      console.log(`Manually tracked product view: ${product.title}`)
    } catch (error) {
      console.error('Error manually tracking product view:', error)
    }
  }

  return { trackProductView }
}
