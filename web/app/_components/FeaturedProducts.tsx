"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRightIcon, FireIcon } from "@heroicons/react/24/outline"
import ProductCard from "./ProductCard"
import type { Product } from "../../lib/types"
import { api } from "../../lib/api-client"

interface FeaturedProductsProps {
  products: Product[]
  loading?: boolean
}

interface HomepageConfig {
  hero_title: string
  hero_subtitle: string | null
  hero_cta_text: string
  hero_image_url: string | null
  featured_product_ids: number[]
  categories_enabled: boolean
}

export default function FeaturedProducts({ products, loading = false }: FeaturedProductsProps) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [config, setConfig] = useState<HomepageConfig | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    if (config && products.length > 0) {
      selectFeaturedProducts()
    }
  }, [config, products])

  const loadConfig = async () => {
    try {
      const configData = await api<HomepageConfig>('/api/homepage-config')
      setConfig(configData)
    } catch (error) {
      console.error('Failed to load homepage config:', error)
    }
  }

  const selectFeaturedProducts = () => {
    if (!config || !products.length) return

    let featured: Product[] = []

    // If admin has selected specific products, use those
    if (config.featured_product_ids && config.featured_product_ids.length > 0) {
      featured = products.filter(product =>
        config.featured_product_ids.includes(product.id)
      )

      // Maintain the order specified by admin
      featured.sort((a, b) => {
        const aIndex = config.featured_product_ids.indexOf(a.id)
        const bIndex = config.featured_product_ids.indexOf(b.id)
        return aIndex - bIndex
      })
    }

    // If no admin selection or not enough products, fill with random products
    if (featured.length < 4) {
      const remaining = products.filter(product =>
        !featured.some(fp => fp.id === product.id)
      )
      const needed = 4 - featured.length
      const randomProducts = remaining.slice(0, needed)
      featured = [...featured, ...randomProducts]
    }

    // Limit to 4 products
    setFeaturedProducts(featured.slice(0, 4))
  }

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="h-8 bg-neutral-200 rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-neutral-200 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-neutral-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (featuredProducts.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-maroon-100 text-maroon-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <FireIcon className="w-4 h-4" />
            Trending Now
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-ink-700 mb-4">
            Featured Products
          </h2>
          <p className="text-lg text-ink-600 max-w-2xl mx-auto">
            Discover our handpicked selection of premium fashion essentials at unbeatable prices
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {featuredProducts.map((product, index) => (
            <div 
              key={product.id}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <Link 
            href="#catalog"
            className="inline-flex items-center gap-2 bg-maroon-700 text-white px-8 py-4 rounded-xl font-medium hover:bg-maroon-800 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group"
          >
            View All Products
            <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
