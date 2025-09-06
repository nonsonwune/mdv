"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronDownIcon,
  UserIcon,
  SparklesIcon,
  TagIcon,
  CubeIcon,
  ShirtIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api-client'

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
      const data = await api<NavigationData>('/api/navigation/categories')
      setNavigationData(data)
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
  const pathname = usePathname()

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
    const iconComponents: Record<string, React.ReactNode> = {
      'men': <UserIcon className="h-5 w-5" />,
      'women': <UserIcon className="h-5 w-5" />,
      'essentials': <SparklesIcon className="h-5 w-5" />,
      'sale': <TagIcon className="h-5 w-5" />,
      'shoes': <BuildingStorefrontIcon className="h-5 w-5" />,
      'shirts': <ShirtIcon className="h-5 w-5" />,
      'pants': <CubeIcon className="h-5 w-5" />,
      'accessories': <CubeIcon className="h-5 w-5" />,
      'watches': <CubeIcon className="h-5 w-5" />,
      'jewelry': <CubeIcon className="h-5 w-5" />
    }
    return iconComponents[icon || ''] || <CubeIcon className="h-5 w-5" />
  }

  if (loading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
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
          className="flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-base md:text-sm font-medium transition-colors group min-h-[44px] text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        >
          <span className="text-gray-500 group-hover:text-gray-700">ℹ️</span>
          <span className="flex-1">About</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Dynamic Categories */}
      {navigationData.categories.map((category) => {
        const categoryPath = `/${category.slug}`
        const isActive = pathname === categoryPath

        return (
          <div key={category.id}>
            <div className="flex items-center">
              <Link
                href={categoryPath}
                className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-base md:text-sm font-medium transition-colors group min-h-[44px] flex-1 ${
                  isActive
                    ? 'bg-maroon-50 text-maroon-700 border border-maroon-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={`${isActive ? 'text-maroon-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                  {getIconForCategory(category.navigation_icon)}
                </span>
                <span className="flex-1">
                  {category.name}
                  {category.slug === 'sale' && (
                    <span className="ml-2 bg-maroon-600 text-white text-xs px-2 py-0.5 rounded-full">
                      SALE
                    </span>
                  )}
                </span>
                {isActive && (
                  <div className="w-2 h-2 bg-maroon-600 rounded-full"></div>
                )}
              </Link>

              {category.children.length > 0 && (
                <button
                  onClick={() => toggleExpanded(category.id)}
                  className="p-2 hover:bg-gray-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={`${expandedCategories.has(category.id) ? 'Collapse' : 'Expand'} ${category.name} subcategories`}
                >
                  <ChevronDownIcon
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedCategories.has(category.id) ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Subcategories */}
            {category.children.length > 0 && expandedCategories.has(category.id) && (
              <div className="ml-6 mt-1 space-y-1">
                {category.children.map((child) => {
                  const childPath = `/${category.slug}/${child.slug}`
                  const isChildActive = pathname === childPath

                  return (
                    <Link
                      key={child.id}
                      href={childPath}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group min-h-[40px] ${
                        isChildActive
                          ? 'bg-maroon-50 text-maroon-700 border border-maroon-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className={`${isChildActive ? 'text-maroon-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        {getIconForCategory(child.navigation_icon)}
                      </span>
                      <span className="flex-1">{child.name}</span>
                      {child.product_count > 0 && (
                        <span className="text-xs text-gray-400">({child.product_count})</span>
                      )}
                      {isChildActive && (
                        <div className="w-2 h-2 bg-maroon-600 rounded-full"></div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
