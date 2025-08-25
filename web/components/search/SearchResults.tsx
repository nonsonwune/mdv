"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, Button, Badge, EmptyState } from '../ui'
import { formatNaira } from '../../lib/format'
import { useWishlist } from '../../hooks/useWishlist'
import { useCart } from '../../hooks/useCart'
import type { Product } from '../../lib/types'

interface SearchResult extends Product {
  relevanceScore?: number
  isNew?: boolean
  isBestSeller?: boolean
  discount?: number
}

interface SearchResultsProps {
  results: SearchResult[]
  loading?: boolean
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
  onSortChange?: (sort: string) => void
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  searchQuery?: string
}

export default function SearchResults({
  results,
  loading = false,
  viewMode = 'grid',
  onViewModeChange,
  onSortChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  searchQuery = ''
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState('relevance')
  const [selectedView, setSelectedView] = useState(viewMode)
  const { toggleItem, isInWishlist } = useWishlist()
  const { addToCart } = useCart()
  const [quickViewProduct, setQuickViewProduct] = useState<SearchResult | null>(null)

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest First' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'bestselling', label: 'Best Selling' }
  ]

  const handleSortChange = (value: string) => {
    setSortBy(value)
    onSortChange?.(value)
  }

  const handleViewChange = (mode: 'grid' | 'list') => {
    setSelectedView(mode)
    onViewModeChange?.(mode)
  }

  const calculateDiscount = (product: SearchResult) => {
    if (product.compare_at_price && product.variants?.[0]?.price) {
      const discount = Math.round(
        ((product.compare_at_price - product.variants[0].price) / product.compare_at_price) * 100
      )
      return discount > 0 ? discount : 0
    }
    return product.discount || 0
  }

  const renderRating = (rating: number = 4.5) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-500' : 'text-neutral-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-xs text-neutral-600 ml-1">({Math.floor(Math.random() * 50) + 10})</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-neutral-200 rounded w-32 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 bg-neutral-200 rounded w-32 animate-pulse" />
            <div className="h-9 bg-neutral-200 rounded w-20 animate-pulse" />
          </div>
        </div>
        <div className={`grid ${selectedView === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="animate-pulse">
                <div className="aspect-square bg-neutral-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2" />
                  <div className="h-5 bg-neutral-200 rounded w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        title="No results found"
        description={searchQuery ? `We couldn't find any products matching "${searchQuery}"` : 'Try adjusting your filters or search terms'}
        action={
          <Button variant="secondary" onClick={() => window.location.href = '/shop'}>
            Browse All Products
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {searchQuery && (
              <>Search results for "<span className="text-maroon-700">{searchQuery}</span>"</>
            )}
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            {results.length} product{results.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-neutral-300 rounded-lg overflow-hidden">
            <button
              onClick={() => handleViewChange('grid')}
              className={`p-2 transition-colors ${
                selectedView === 'grid' 
                  ? 'bg-maroon-700 text-white' 
                  : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
              title="Grid view"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => handleViewChange('list')}
              className={`p-2 transition-colors ${
                selectedView === 'list' 
                  ? 'bg-maroon-700 text-white' 
                  : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
              title="List view"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Results Grid/List */}
      <div className={`
        grid gap-4
        ${selectedView === 'grid' 
          ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
          : 'grid-cols-1'
        }
      `}>
        {results.map(product => {
          const discount = calculateDiscount(product)
          const price = product.variants?.[0]?.price || 0
          const inWishlist = isInWishlist(product.id)

          return selectedView === 'grid' ? (
            // Grid View
            <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={`/product/${product.slug}`}>
                <div className="relative aspect-square bg-neutral-100">
                  {product.images?.[0] && (
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].alt_text || product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.isNew && (
                      <Badge variant="primary" size="sm">New</Badge>
                    )}
                    {product.isBestSeller && (
                      <Badge variant="success" size="sm">Best Seller</Badge>
                    )}
                    {discount > 0 && (
                      <Badge variant="danger" size="sm">-{discount}%</Badge>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        toggleItem(product)
                      }}
                      className={`
                        p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all
                        ${inWishlist ? 'text-red-600' : 'text-neutral-600 hover:text-red-600'}
                      `}
                    >
                      <svg className="w-5 h-5" fill={inWishlist ? 'currentColor' : 'none'} 
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setQuickViewProduct(product)
                      }}
                      className="p-2 rounded-full bg-white shadow-md hover:shadow-lg text-neutral-600 hover:text-maroon-700 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/product/${product.slug}`}>
                  <h3 className="font-medium text-sm mb-1 line-clamp-2 hover:text-maroon-700 transition-colors">
                    {product.title}
                  </h3>
                </Link>
                
                {renderRating()}
                
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-lg">{formatNaira(price)}</span>
                  {product.compare_at_price && (
                    <span className="text-sm text-neutral-500 line-through">
                      {formatNaira(product.compare_at_price)}
                    </span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    if (product.variants?.[0]) {
                      addToCart(product.variants[0].id)
                    }
                  }}
                >
                  Add to Cart
                </Button>
              </div>
            </Card>
          ) : (
            // List View
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="flex gap-4 p-4">
                <Link href={`/product/${product.slug}`} className="flex-shrink-0">
                  <div className="relative w-32 h-32 md:w-48 md:h-48 bg-neutral-100 rounded-lg overflow-hidden">
                    {product.images?.[0] && (
                      <Image
                        src={product.images[0].url}
                        alt={product.images[0].alt_text || product.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    )}
                    {discount > 0 && (
                      <Badge variant="danger" size="sm" className="absolute top-2 left-2">
                        -{discount}%
                      </Badge>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link href={`/product/${product.slug}`}>
                        <h3 className="font-semibold text-lg hover:text-maroon-700 transition-colors">
                          {product.title}
                        </h3>
                      </Link>
                      
                      <div className="flex items-center gap-3 mt-2">
                        {renderRating()}
                        {product.isNew && <Badge variant="primary" size="sm">New</Badge>}
                        {product.isBestSeller && <Badge variant="success" size="sm">Best Seller</Badge>}
                      </div>
                      
                      {product.description && (
                        <p className="text-sm text-neutral-600 mt-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xl">{formatNaira(price)}</span>
                          {product.compare_at_price && (
                            <span className="text-sm text-neutral-500 line-through">
                              {formatNaira(product.compare_at_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleItem(product)}
                        className={`
                          p-2 rounded-full border transition-all
                          ${inWishlist 
                            ? 'bg-red-50 border-red-300 text-red-600' 
                            : 'bg-white border-neutral-300 text-neutral-600 hover:border-red-300 hover:text-red-600'
                          }
                        `}
                      >
                        <svg className="w-5 h-5" fill={inWishlist ? 'currentColor' : 'none'} 
                          viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (product.variants?.[0]) {
                            addToCart(product.variants[0].id)
                          }
                        }}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex gap-1">
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={`
                    px-4 py-2 rounded-lg transition-colors
                    ${currentPage === pageNum 
                      ? 'bg-maroon-700 text-white' 
                      : 'border border-neutral-300 hover:bg-neutral-50'
                    }
                  `}
                >
                  {pageNum}
                </button>
              )
            })}
            {totalPages > 5 && (
              <>
                <span className="px-2">...</span>
                <button
                  onClick={() => onPageChange?.(totalPages)}
                  className={`
                    px-4 py-2 rounded-lg transition-colors
                    ${currentPage === totalPages 
                      ? 'bg-maroon-700 text-white' 
                      : 'border border-neutral-300 hover:bg-neutral-50'
                    }
                  `}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
