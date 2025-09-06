'use client'

import { useState, useEffect, useMemo } from 'react'
import { Product } from '@/lib/types'
import ProductCard from './ProductCard'
import { MobileButton } from '../ui/MobileOptimizedForm'
import { 
  AdjustmentsHorizontalIcon, 
  Squares2X2Icon, 
  ListBulletIcon,
  ChevronDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

interface MobileProductGridProps {
  products: Product[]
  loading?: boolean
  title?: string
  showFilters?: boolean
  showSort?: boolean
  showViewToggle?: boolean
  emptyMessage?: string
  onLoadMore?: () => void
  hasMore?: boolean
  loadingMore?: boolean
}

type ViewMode = 'grid' | 'list'
type SortOption = 'newest' | 'price-low' | 'price-high' | 'name' | 'popularity'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' }
]

export default function MobileProductGrid({
  products,
  loading = false,
  title,
  showFilters = true,
  showSort = true,
  showViewToggle = true,
  emptyMessage = 'No products found',
  onLoadMore,
  hasMore = false,
  loadingMore = false
}: MobileProductGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // Sort products based on selected option
  const sortedProducts = useMemo(() => {
    const sorted = [...products]
    
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => {
          const priceA = a.variants?.[0]?.price || 0
          const priceB = b.variants?.[0]?.price || 0
          return priceA - priceB
        })
      case 'price-high':
        return sorted.sort((a, b) => {
          const priceA = a.variants?.[0]?.price || 0
          const priceB = b.variants?.[0]?.price || 0
          return priceB - priceA
        })
      case 'name':
        return sorted.sort((a, b) => a.title.localeCompare(b.title))
      case 'popularity':
        return sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      case 'newest':
      default:
        return sorted.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
    }
  }, [products, sortBy])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSortMenu(false)
      setShowFilterMenu(false)
    }

    if (showSortMenu || showFilterMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showSortMenu, showFilterMenu])

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Loading header */}
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        
        {/* Loading grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {title && (
          <h2 className="text-xl md:text-2xl font-semibold text-ink-700">
            {title}
          </h2>
        )}
        
        <div className="flex items-center gap-2">
          {/* Filter Button */}
          {showFilters && (
            <div className="relative">
              <MobileButton
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowFilterMenu(!showFilterMenu)
                  setShowSortMenu(false)
                }}
                icon={<FunnelIcon className="w-4 h-4" />}
              >
                Filter
              </MobileButton>
              
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Filters</h3>
                    <p className="text-sm text-gray-500">Filter options coming soon...</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Sort Button */}
          {showSort && (
            <div className="relative">
              <MobileButton
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSortMenu(!showSortMenu)
                  setShowFilterMenu(false)
                }}
                icon={<ChevronDownIcon className="w-4 h-4" />}
              >
                Sort
              </MobileButton>
              
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value)
                          setShowSortMenu(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          sortBy === option.value ? 'text-maroon-700 bg-maroon-50' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* View Toggle */}
          {showViewToggle && (
            <div className="hidden md:flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-maroon-700 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label="Grid view"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-maroon-700 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label="List view"
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}
      </div>

      {/* Product Grid/List */}
      {sortedProducts.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4' 
            : 'space-y-4'
        }>
          {sortedProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 4}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="text-center pt-8">
          <MobileButton
            onClick={onLoadMore}
            isLoading={loadingMore}
            variant="secondary"
            size="lg"
            className="w-full md:w-auto"
          >
            {loadingMore ? 'Loading...' : 'Load More Products'}
          </MobileButton>
        </div>
      )}
    </div>
  )
}
