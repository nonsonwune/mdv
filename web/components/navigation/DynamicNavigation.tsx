"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface NavigationCategory {
  id: number
  name: string
  slug: string
  parent_id?: number
  navigation_icon?: string
  sort_order: number
  product_count: number
  children: NavigationCategory[]
}

interface NavigationData {
  categories: NavigationCategory[]
}

export default function DynamicNavigation() {
  const [navigationData, setNavigationData] = useState<NavigationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null)

  useEffect(() => {
    fetchNavigationData()
  }, [])

  const fetchNavigationData = async () => {
    try {
      const response = await fetch('/api/navigation/categories')
      if (response.ok) {
        const data = await response.json()
        setNavigationData(data)
      }
    } catch (error) {
      console.error('Failed to fetch navigation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIconForCategory = (icon?: string) => {
    const iconMap: Record<string, string> = {
      'men': '👔',
      'women': '👗',
      'essentials': '✨',
      'sale': '🏷️',
      'shoes': '👟',
      'shirts': '👕',
      'pants': '👖',
      'accessories': '👜',
      'watches': '⌚',
      'jewelry': '💍'
    }
    return iconMap[icon || ''] || '📦'
  }

  if (loading) {
    return (
      <nav className="hidden md:flex items-center gap-6 text-sm">
        <div className="animate-pulse flex space-x-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-16"></div>
          ))}
        </div>
      </nav>
    )
  }

  if (!navigationData?.categories?.length) {
    return (
      <nav className="hidden md:flex items-center gap-6 text-sm">
        <Link href="/about" className="hover:text-maroon-700 transition-colors">About</Link>
      </nav>
    )
  }

  return (
    <nav className="hidden md:flex items-center gap-6 text-sm">
      {navigationData.categories.map((category) => (
        <div
          key={category.id}
          className="relative"
          onMouseEnter={() => setHoveredCategory(category.id)}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          <Link
            href={`/${category.slug}`}
            className={`flex items-center gap-1 hover:text-maroon-700 transition-colors ${
              category.slug === 'sale' ? 'font-medium text-maroon-700' : ''
            }`}
          >
            {category.navigation_icon && (
              <span className="text-base">{getIconForCategory(category.navigation_icon)}</span>
            )}
            {category.name}
            {category.children.length > 0 && (
              <ChevronDownIcon className="w-3 h-3 ml-1" />
            )}
          </Link>

          {/* Dropdown Menu */}
          {category.children.length > 0 && hoveredCategory === category.id && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 z-50">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/${category.slug}/${child.slug}`}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-maroon-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {child.navigation_icon && (
                        <span className="text-sm">{getIconForCategory(child.navigation_icon)}</span>
                      )}
                      {child.name}
                    </span>
                    {child.product_count > 0 && (
                      <span className="text-xs text-gray-400">({child.product_count})</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      
      {/* Static About Link */}
      <Link href="/about" className="hover:text-maroon-700 transition-colors">About</Link>
    </nav>
  )
}

// Mobile version of dynamic navigation
export function DynamicMobileNavigation() {
  const [navigationData, setNavigationData] = useState<NavigationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchNavigationData()
  }, [])

  const fetchNavigationData = async () => {
    try {
      const response = await fetch('/api/navigation/categories')
      if (response.ok) {
        const data = await response.json()
        setNavigationData(data)
      }
    } catch (error) {
      console.error('Failed to fetch navigation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const getIconForCategory = (icon?: string) => {
    const iconMap: Record<string, string> = {
      'men': '👔',
      'women': '👗',
      'essentials': '✨',
      'sale': '🏷️',
      'shoes': '👟',
      'shirts': '👕',
      'pants': '👖',
      'accessories': '👜',
      'watches': '⌚',
      'jewelry': '💍'
    }
    return iconMap[icon || ''] || '📦'
  }

  if (loading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!navigationData?.categories?.length) {
    return (
      <div className="space-y-1">
        <Link
          href="/about"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <span className="text-lg">ℹ️</span>
          <span className="font-medium">About</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Home Link */}
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <span className="text-lg">🏠</span>
        <span className="font-medium">Home</span>
      </Link>

      {/* Dynamic Categories */}
      {navigationData.categories.map((category) => (
        <div key={category.id}>
          <div className="flex items-center">
            <Link
              href={`/${category.slug}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors flex-1 ${
                category.slug === 'sale' ? 'text-maroon-700' : ''
              }`}
            >
              <span className="text-lg">{getIconForCategory(category.navigation_icon)}</span>
              <span className={`font-medium ${category.slug === 'sale' ? 'text-maroon-700' : ''}`}>
                {category.name}
              </span>
              {category.slug === 'sale' && (
                <span className="ml-auto bg-maroon-700 text-white text-xs px-2 py-0.5 rounded">
                  SALE
                </span>
              )}
            </Link>
            
            {category.children.length > 0 && (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="p-2 hover:bg-neutral-100 rounded"
              >
                <ChevronDownIcon 
                  className={`w-4 h-4 transition-transform ${
                    expandedCategories.has(category.id) ? 'rotate-180' : ''
                  }`} 
                />
              </button>
            )}
          </div>

          {/* Subcategories */}
          {category.children.length > 0 && expandedCategories.has(category.id) && (
            <div className="ml-6 mt-1 space-y-1">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/${category.slug}/${child.slug}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors text-sm"
                >
                  <span className="text-base">{getIconForCategory(child.navigation_icon)}</span>
                  <span>{child.name}</span>
                  {child.product_count > 0 && (
                    <span className="ml-auto text-xs text-gray-400">({child.product_count})</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
