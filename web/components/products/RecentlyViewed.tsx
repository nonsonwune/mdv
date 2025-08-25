"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Product } from "../../lib/types"
import { Card } from "../ui"

export default function RecentlyViewed({ currentProductId }: { currentProductId?: number }) {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("mdv_recently_viewed")
    if (stored) {
      const parsed = JSON.parse(stored) as Product[]
      // Filter out current product if viewing a product page
      const filtered = currentProductId 
        ? parsed.filter(p => p.id !== currentProductId)
        : parsed
      setProducts(filtered.slice(0, 4))
    }
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
