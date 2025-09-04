"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Product } from "../../lib/types"
import { Card } from "../ui"

// Version for localStorage cleanup - increment when validation logic changes
const RECENTLY_VIEWED_VERSION = "v3.0"
const VERSION_KEY = "mdv_recently_viewed_version"
const STORAGE_KEY = "mdv_recently_viewed"
const MAX_PRODUCTS = 10
const VALIDATION_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
const LAST_VALIDATION_KEY = "mdv_recently_viewed_last_validation"

interface RecentlyViewedItem {
  productId: string
  viewedAt: string
  product: Product
}

interface RecentlyViewedProps {
  currentProductId?: number
  maxProducts?: number
  showTitle?: boolean
  className?: string
}

export default function RecentlyViewed({
  currentProductId,
  maxProducts = 4,
  showTitle = true,
  className = ""
}: RecentlyViewedProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Validate product data structure
  const isValidProduct = useCallback((product: any): product is Product => {
    return (
      product &&
      typeof product.id === 'number' &&
      typeof product.title === 'string' &&
      typeof product.slug === 'string' &&
      Array.isArray(product.variants) &&
      product.variants.length > 0 &&
      Array.isArray(product.images) &&
      product.variants[0] &&
      typeof product.variants[0].price === 'number'
    )
  }, [])

  // Check if product exists via HEAD request
  const checkProductExists = useCallback(async (productId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'HEAD',
        cache: 'no-cache'
      })
      return response.ok
    } catch (error) {
      console.warn(`Could not validate product ${productId}:`, error)
      // On network error, assume product exists to avoid removing valid products
      return true
    }
  }, [])

  // Get stored recently viewed items
  const getStoredItems = useCallback((): RecentlyViewedItem[] => {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []

      const parsed = JSON.parse(stored)

      // Handle both old format (Product[]) and new format (RecentlyViewedItem[])
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return []

        // Check if it's old format (direct Product array)
        if (parsed[0] && typeof parsed[0].id === 'number' && !parsed[0].productId) {
          // Convert old format to new format
          const converted: RecentlyViewedItem[] = parsed
            .filter(isValidProduct)
            .map((product: Product) => ({
              productId: String(product.id),
              viewedAt: new Date().toISOString(),
              product
            }))

          // Save in new format
          localStorage.setItem(STORAGE_KEY, JSON.stringify(converted))
          return converted
        }

        // New format - validate structure
        return parsed.filter((item: any) =>
          item &&
          typeof item.productId === 'string' &&
          typeof item.viewedAt === 'string' &&
          isValidProduct(item.product)
        )
      }

      return []
    } catch (error) {
      console.error('Error parsing recently viewed products:', error)
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
  }, [isValidProduct])

  // Save items to localStorage
  const saveItems = useCallback((items: RecentlyViewedItem[]) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Error saving recently viewed products:', error)
    }
  }, [])

  useEffect(() => {
    const validateAndLoadProducts = async () => {
      setValidationError(null)

      // Check if we need validation
      const currentVersion = localStorage.getItem(VERSION_KEY)
      const lastValidation = localStorage.getItem(LAST_VALIDATION_KEY)
      const now = Date.now()

      const needsVersionUpdate = currentVersion !== RECENTLY_VIEWED_VERSION
      const needsPeriodicValidation = !lastValidation ||
        (now - parseInt(lastValidation)) > VALIDATION_INTERVAL

      // Get stored items
      let items = getStoredItems()

      if (items.length === 0) {
        if (needsVersionUpdate) {
          localStorage.setItem(VERSION_KEY, RECENTLY_VIEWED_VERSION)
          localStorage.setItem(LAST_VALIDATION_KEY, String(now))
        }
        setProducts([])
        return
      }

      // Filter out current product if viewing a product page
      const filtered = currentProductId
        ? items.filter(item => item.product.id !== currentProductId)
        : items

      // Filter out old items (older than 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentItems = filtered.filter(item => {
        const viewedDate = new Date(item.viewedAt)
        return viewedDate > thirtyDaysAgo
      })

      // Show products immediately (optimistic UI)
      const displayProducts = recentItems
        .slice(0, maxProducts)
        .map(item => item.product)

      setProducts(displayProducts)

      // Perform validation if needed (background)
      if (needsVersionUpdate || needsPeriodicValidation) {
        setIsValidating(true)

        const validateProducts = async () => {
          try {
            const validatedItems: RecentlyViewedItem[] = []

            // Validate each product exists in database
            for (const item of recentItems) {
              const exists = await checkProductExists(item.product.id)

              if (exists) {
                validatedItems.push(item)
              } else {
                console.log(`Removing deleted product from recently viewed: ${item.product.title}`)
              }
            }

            // Update storage if products were removed
            if (validatedItems.length !== recentItems.length) {
              saveItems(validatedItems)

              // Update displayed products
              const updatedDisplayProducts = validatedItems
                .filter(item => !currentProductId || item.product.id !== currentProductId)
                .slice(0, maxProducts)
                .map(item => item.product)

              setProducts(updatedDisplayProducts)

              console.log(`Cleaned up recently viewed: removed ${recentItems.length - validatedItems.length} deleted products`)
            }

            // Update version and validation timestamp
            localStorage.setItem(VERSION_KEY, RECENTLY_VIEWED_VERSION)
            localStorage.setItem(LAST_VALIDATION_KEY, String(now))

          } catch (error) {
            console.error('Error validating recently viewed products:', error)
            setValidationError('Failed to validate products')
          } finally {
            setIsValidating(false)
          }
        }

        // Run validation in background
        validateProducts()
      } else {
        // Update storage if we cleaned old items
        if (recentItems.length !== items.length) {
          saveItems(recentItems)
        }
      }
    }

    validateAndLoadProducts()
  }, [currentProductId, maxProducts, getStoredItems, saveItems, checkProductExists, isValidProduct])

  // Function to add a product to recently viewed
  const addProduct = useCallback((product: Product) => {
    if (!isValidProduct(product)) {
      console.warn('Invalid product data provided to addProduct:', product)
      return
    }

    const items = getStoredItems()
    const productId = String(product.id)

    // Remove existing entry if present
    const filteredItems = items.filter(item => item.productId !== productId)

    // Add new entry at the beginning
    const newItem: RecentlyViewedItem = {
      productId,
      viewedAt: new Date().toISOString(),
      product
    }

    const updatedItems = [newItem, ...filteredItems].slice(0, MAX_PRODUCTS)
    saveItems(updatedItems)

    // Update displayed products if not on current product page
    if (!currentProductId || product.id !== currentProductId) {
      const displayProducts = updatedItems
        .filter(item => !currentProductId || item.product.id !== currentProductId)
        .slice(0, maxProducts)
        .map(item => item.product)

      setProducts(displayProducts)
    }
  }, [isValidProduct, getStoredItems, saveItems, currentProductId, maxProducts])

  // Expose addProduct function for external use
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    addProduct
  }), [addProduct])

  if (products.length === 0) return null

  return (
    <div className={`mt-12 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recently Viewed</h2>
          {isValidating && (
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Validating...
            </div>
          )}
        </div>
      )}

      {validationError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">{validationError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(product => {
          const price = product.variants?.[0]?.price || 0
          const image = product.images?.[0]
          
          return (
            <Link key={product.id} href={`/product/${product.slug}`}>
              <Card className="p-3 hover:shadow-md transition-shadow">
                <div className="aspect-square bg-neutral-100 rounded-md overflow-hidden mb-2">
                  {image?.url ? (
                    <Image
                      src={image.url}
                      alt={image.alt_text || product.title}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-200" />
                  )}
                </div>
                <h3 className="text-sm font-medium line-clamp-1">{product.title}</h3>
                <p className="text-sm font-semibold mt-1">₦{price.toLocaleString()}</p>
              </Card>
            </Link>
          )
        })}
      </div>
      
      {products.length >= 4 && (
        <div className="mt-4 text-center">
          <button 
            onClick={() => {
              // In a real app, this would navigate to a dedicated recently viewed page
              alert("Recently viewed page coming soon!")
            }}
            className="text-sm text-maroon-700 hover:text-maroon-800 underline"
          >
            View all recently viewed
          </button>
        </div>
      )}
    </div>
  )
}

// Hook for adding products to recently viewed from other components
export function useRecentlyViewed() {
  const addProduct = useCallback((product: Product) => {
    if (typeof window === 'undefined') return

    // Validate product data
    const isValid = (
      product &&
      typeof product.id === 'number' &&
      typeof product.title === 'string' &&
      typeof product.slug === 'string' &&
      Array.isArray(product.variants) &&
      product.variants.length > 0 &&
      Array.isArray(product.images) &&
      product.variants[0] &&
      typeof product.variants[0].price === 'number'
    )

    if (!isValid) {
      console.warn('Invalid product data provided to useRecentlyViewed:', product)
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      let items: RecentlyViewedItem[] = []

      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          // Handle both old and new formats
          if (parsed.length > 0 && parsed[0] && typeof parsed[0].id === 'number' && !parsed[0].productId) {
            // Old format - convert
            items = parsed
              .filter((p: any) => p && p.id !== product.id)
              .map((p: Product) => ({
                productId: String(p.id),
                viewedAt: new Date().toISOString(),
                product: p
              }))
          } else {
            // New format
            items = parsed.filter((item: any) =>
              item &&
              item.productId !== String(product.id) &&
              typeof item.productId === 'string' &&
              typeof item.viewedAt === 'string' &&
              item.product
            )
          }
        }
      }

      // Add new item at the beginning
      const newItem: RecentlyViewedItem = {
        productId: String(product.id),
        viewedAt: new Date().toISOString(),
        product
      }

      const updatedItems = [newItem, ...items].slice(0, MAX_PRODUCTS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems))

    } catch (error) {
      console.error('Error adding product to recently viewed:', error)
    }
  }, [])

  return { addProduct }
}
