"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Product } from "../../lib/types"
import { Card } from "../ui"

// Version for localStorage cleanup - increment when validation logic changes
const RECENTLY_VIEWED_VERSION = "v2.0"
const VERSION_KEY = "mdv_recently_viewed_version"

export default function RecentlyViewed({ currentProductId }: { currentProductId?: number }) {
  const [products, setProducts] = useState<Product[]>([])
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    const validateAndLoadProducts = async () => {
      // Check if we need to force cleanup due to version change
      const currentVersion = localStorage.getItem(VERSION_KEY)
      const forceCleanup = currentVersion !== RECENTLY_VIEWED_VERSION

      const stored = localStorage.getItem("mdv_recently_viewed")
      if (!stored) {
        if (forceCleanup) {
          localStorage.setItem(VERSION_KEY, RECENTLY_VIEWED_VERSION)
        }
        return
      }

      try {
        const parsed = JSON.parse(stored) as Product[]

        // Filter out current product if viewing a product page
        const filtered = currentProductId
          ? parsed.filter(p => p.id !== currentProductId)
          : parsed

        // Basic data validation - ensure products have required fields
        let validProducts = filtered.filter(product =>
          product &&
          product.id &&
          product.title &&
          product.slug &&
          Array.isArray(product.variants) &&
          Array.isArray(product.images)
        )

        // Show products immediately, then validate in background
        setProducts(validProducts.slice(0, 4))

        // If force cleanup, validate products exist in database (background)
        if (forceCleanup && validProducts.length > 0) {
          setIsValidating(true)

          // Validate products exist in database in background
          const validateProducts = async () => {
            const existingProducts = []

            // Check each product individually (more reliable than batch)
            for (const product of validProducts.slice(0, 4)) {
              try {
                // Use HEAD request to check if product exists (lightweight)
                const response = await fetch(`/api/products/${product.id}`, {
                  method: 'HEAD',
                  cache: 'no-cache'
                })

                if (response.ok) {
                  existingProducts.push(product)
                } else if (response.status === 404) {
                  // Product was deleted, don't include it
                  console.log(`Removing deleted product from recently viewed: ${product.title}`)
                } else {
                  // Other error (network, server), keep the product
                  existingProducts.push(product)
                }
              } catch (error) {
                // Network error, keep the product
                console.warn(`Could not validate product ${product.id}:`, error)
                existingProducts.push(product)
              }
            }

            // Update localStorage and state if products were removed
            if (existingProducts.length !== validProducts.length) {
              localStorage.setItem("mdv_recently_viewed", JSON.stringify(existingProducts))
              setProducts(existingProducts.slice(0, 4))
              console.log(`Cleaned up recently viewed: removed ${validProducts.length - existingProducts.length} deleted products`)
            }

            localStorage.setItem(VERSION_KEY, RECENTLY_VIEWED_VERSION)
            setIsValidating(false)
          }

          // Run validation in background
          validateProducts()
        } else if (forceCleanup) {
          // No products to validate, just update version
          localStorage.setItem(VERSION_KEY, RECENTLY_VIEWED_VERSION)
        }

        // Update localStorage if we cleaned anything during basic validation
        if (validProducts.length !== parsed.length) {
          localStorage.setItem("mdv_recently_viewed", JSON.stringify(validProducts))
        }
      } catch (error) {
        console.error('Error parsing recently viewed products:', error)
        // Clear corrupted data and set version
        localStorage.removeItem("mdv_recently_viewed")
        localStorage.setItem(VERSION_KEY, RECENTLY_VIEWED_VERSION)
        setProducts([])
        setIsValidating(false)
      }
    }

    validateAndLoadProducts()
  }, [currentProductId])

  if (products.length === 0) return null

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-4">Recently Viewed</h2>
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
