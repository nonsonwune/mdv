"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { ArrowRightIcon } from "@heroicons/react/24/outline"
import { api } from "../../lib/api-client"

interface Category {
  id: number
  name: string
  slug: string
  description?: string
  product_count?: number
}

interface HomepageConfig {
  hero_title: string
  hero_subtitle: string | null
  hero_cta_text: string
  hero_image_url: string | null
  featured_product_ids: number[]
  categories_enabled: boolean
}

const defaultCategories = [
  {
    id: 'men',
    title: "Men's Collection",
    description: "Discover stylish essentials for the modern man",
    href: '/men',
    image: '/api/placeholder/400/500',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'women',
    title: "Women's Collection",
    description: "Elegant pieces for the contemporary woman",
    href: '/women',
    image: '/api/placeholder/400/500',
    color: 'from-pink-500 to-pink-600'
  },
  {
    id: 'essentials',
    title: "Everyday Essentials",
    description: "Quality basics for your daily wardrobe",
    href: '/essentials',
    image: '/api/placeholder/400/500',
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'sale',
    title: "Sale & Clearance",
    description: "Amazing deals on premium fashion",
    href: '/sale',
    image: '/api/placeholder/400/500',
    color: 'from-maroon-500 to-maroon-600'
  }
]

export default function CategoriesShowcase() {
  const [config, setConfig] = useState<HomepageConfig | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [configData, categoriesData] = await Promise.all([
        api<HomepageConfig>('/api/homepage-config'),
        api<Category[]>('/api/categories').catch(() => [])
      ])

      setConfig(configData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to load categories data:', error)
      setConfig({ categories_enabled: true } as HomepageConfig)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if categories are disabled
  if (config && !config.categories_enabled) {
    return null
  }

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-neutral-200 rounded w-96 mx-auto mb-12"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-neutral-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }
  return (
    <section className="py-16 bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-ink-700 mb-4">
            Shop by Category
          </h2>
          <p className="text-lg text-ink-600 max-w-2xl mx-auto">
            Explore our curated collections designed to fit every style and occasion
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(categories.length > 0 ? categories.slice(0, 4) : defaultCategories).map((category, index) => {
            const isRealCategory = 'slug' in category
            const displayCategory = isRealCategory ? {
              id: category.slug,
              title: category.name,
              description: category.description || `Explore our ${category.name.toLowerCase()} collection`,
              href: `/category/${category.slug}`,
              color: defaultCategories[index % defaultCategories.length].color
            } : category

            return (
            <Link
              key={displayCategory.id}
              href={displayCategory.href}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Image */}
              <div className="aspect-[3/4] relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${displayCategory.color} opacity-90`}></div>
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Placeholder for category image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 bg-white/40 rounded"></div>
                    </div>
                    <div className="text-sm opacity-75">Category Image</div>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="bg-white text-ink-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    Shop Now
                    <ArrowRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-ink-700 mb-2 group-hover:text-maroon-700 transition-colors duration-200">
                  {displayCategory.title}
                </h3>
                <p className="text-ink-600 text-sm leading-relaxed">
                  {displayCategory.description}
                </p>
                {isRealCategory && category.product_count && (
                  <p className="text-ink-500 text-xs mt-2">
                    {category.product_count} products
                  </p>
                )}
                
                {/* Arrow Icon */}
                <div className="mt-4 flex items-center text-maroon-700 font-medium text-sm">
                  Explore Collection
                  <ArrowRightIcon className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-4 bg-white rounded-2xl shadow-lg p-6">
            <div className="text-left">
              <div className="font-bold text-ink-700 text-lg">Can't find what you're looking for?</div>
              <div className="text-ink-600 text-sm">Browse our complete collection</div>
            </div>
            <Link 
              href="/products"
              className="btn-primary whitespace-nowrap"
            >
              View All
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
