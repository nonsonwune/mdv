"use client"

import { useState, useEffect } from "react"
import { useProductFilters, sortOptions } from "../../hooks/useProductFilters"
import { usePagination } from "../../hooks/usePagination"
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll"
import ProductCard from "../products/ProductCard"
import RecentlyViewed from "../products/RecentlyViewed"
import { Button, Drawer } from "../ui"
import { Pagination, SimplePagination, LoadMoreButton } from "../ui/Pagination"
import { LoadMoreTrigger } from "../ui/LoadMoreTrigger"
import type { Product } from "../../lib/types"

interface EnhancedCategoryPageProps {
  title: string
  description?: string
  products: Product[]
  category?: string
}

export default function EnhancedCategoryPage({
  title,
  description,
  products,
  category,
}: EnhancedCategoryPageProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [paginationMode, setPaginationMode] = useState<"pagination" | "infinite" | "load-more">("pagination")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const {
    filters,
    sortBy,
    searchQuery,
    filteredProducts,
    totalProducts,
    filteredCount,
    availableOptions,
    updateFilter,
    clearFilters,
    toggleArrayFilter,
    setSortBy,
    setSearchQuery,
  } = useProductFilters(products)
  
  // Pagination
  const pagination = usePagination({
    items: filteredProducts,
    itemsPerPage: 12,
    infiniteScroll: paginationMode === "infinite",
  })
  
  // Infinite scroll
  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: () => {
      setIsLoadingMore(true)
      // Simulate loading delay
      setTimeout(() => {
        pagination.loadMore()
        setIsLoadingMore(false)
      }, 500)
    },
    hasMore: pagination.hasMore && paginationMode === "infinite",
    loading: isLoadingMore,
  })
  
  // Reset pagination when filters change
  useEffect(() => {
    pagination.reset()
  }, [filters, sortBy, searchQuery])

  const hasActiveFilters = 
    filters.categories.length > 0 ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.inStock ||
    filters.onSale ||
    searchQuery ||
    (filters.priceRange[0] > availableOptions.priceRange[0] || 
     filters.priceRange[1] < availableOptions.priceRange[1])

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--ink-50)" }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--ink-800)" }}>
            {title}
          </h1>
          {description && (
            <p className="text-lg" style={{ color: "var(--ink-600)" }}>
              {description}
            </p>
          )}
          
          {/* Search Bar */}
          <div className="mt-4 max-w-xl">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: "var(--ink-400)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                style={{ 
                  borderColor: "var(--ink-200)"
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm"
                  style={{ color: "var(--ink-500)" }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: "var(--ink-200)" }}>
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowMobileFilters(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-maroon-700 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {filters.categories.length + filters.sizes.length + filters.colors.length + 
                   (filters.inStock ? 1 : 0) + (filters.onSale ? 1 : 0)}
                </span>
              )}
            </Button>
            
            <span className="text-sm" style={{ color: "var(--ink-600)" }}>
              {filteredCount} of {totalProducts} products
            </span>
            
            {/* Pagination Mode Toggle */}
            <div className="hidden lg:flex items-center gap-1 border rounded-lg p-1" style={{ borderColor: "var(--ink-200)" }}>
              <button
                onClick={() => setPaginationMode("pagination")}
                className={`px-2 py-1 text-xs rounded ${paginationMode === 'pagination' ? 'bg-maroon-700 text-white' : 'text-ink-600'}`}
                aria-label="Pagination mode"
              >
                Pages
              </button>
              <button
                onClick={() => setPaginationMode("infinite")}
                className={`px-2 py-1 text-xs rounded ${paginationMode === 'infinite' ? 'bg-maroon-700 text-white' : 'text-ink-600'}`}
                aria-label="Infinite scroll mode"
              >
                Infinite
              </button>
              <button
                onClick={() => setPaginationMode("load-more")}
                className={`px-2 py-1 text-xs rounded ${paginationMode === 'load-more' ? 'bg-maroon-700 text-white' : 'text-ink-600'}`}
                aria-label="Load more mode"
              >
                Load More
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden md:flex items-center gap-1 border rounded-lg p-1" style={{ borderColor: "var(--ink-200)" }}>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-maroon-700 text-white' : 'text-ink-600'}`}
                aria-label="Grid view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-maroon-700 text-white' : 'text-ink-600'}`}
                aria-label="List view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm"
            style={{ borderColor: "var(--ink-200)" }}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--ink-700)" }}>Active filters:</span>
            
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-maroon-100 text-maroon-800 rounded-full text-sm">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery("")} className="ml-1">×</button>
              </span>
            )}
            
            {filters.categories.map(cat => (
              <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 bg-maroon-100 text-maroon-800 rounded-full text-sm">
                {cat}
                <button onClick={() => toggleArrayFilter('categories', cat)} className="ml-1">×</button>
              </span>
            ))}
            
            {filters.sizes.map(size => (
              <span key={size} className="inline-flex items-center gap-1 px-2 py-1 bg-maroon-100 text-maroon-800 rounded-full text-sm">
                Size: {size}
                <button onClick={() => toggleArrayFilter('sizes', size)} className="ml-1">×</button>
              </span>
            ))}
            
            {filters.colors.map(color => (
              <span key={color} className="inline-flex items-center gap-1 px-2 py-1 bg-maroon-100 text-maroon-800 rounded-full text-sm">
                Color: {color}
                <button onClick={() => toggleArrayFilter('colors', color)} className="ml-1">×</button>
              </span>
            ))}
            
            {filters.inStock && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-maroon-100 text-maroon-800 rounded-full text-sm">
                In Stock
                <button onClick={() => updateFilter('inStock', false)} className="ml-1">×</button>
              </span>
            )}
            
            {filters.onSale && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-maroon-100 text-maroon-800 rounded-full text-sm">
                On Sale
                <button onClick={() => updateFilter('onSale', false)} className="ml-1">×</button>
              </span>
            )}
            
            <button
              onClick={clearFilters}
              className="text-sm text-maroon-700 hover:text-maroon-800 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <FilterSection
                filters={filters}
                availableOptions={availableOptions}
                onUpdateFilter={updateFilter}
                onToggleArrayFilter={toggleArrayFilter}
                onClearFilters={clearFilters}
              />
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {filteredProducts.length > 0 ? (
              <>
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "space-y-4"
                }>
                  {pagination.displayedItems.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product}
                    />
                  ))}
                </div>
                
                {/* Pagination Controls */}
                {paginationMode === "pagination" && (
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    pageNumbers={pagination.pageNumbers}
                    onPageChange={pagination.goToPage}
                    onPreviousPage={pagination.goToPreviousPage}
                    onNextPage={pagination.goToNextPage}
                    className="mt-8"
                  />
                )}
                
                {/* Load More Button */}
                {paginationMode === "load-more" && (
                  <LoadMoreButton
                    onClick={() => {
                      setIsLoadingMore(true)
                      setTimeout(() => {
                        pagination.loadMore()
                        setIsLoadingMore(false)
                      }, 500)
                    }}
                    loading={isLoadingMore}
                    hasMore={pagination.hasMore}
                    className="mt-8"
                  />
                )}
                
                {/* Infinite Scroll Trigger */}
                {paginationMode === "infinite" && (
                  <LoadMoreTrigger 
                    ref={loadMoreRef}
                    loading={isLoadingMore}
                    hasMore={pagination.hasMore}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg mb-4" style={{ color: "var(--ink-600)" }}>
                  No products found matching your filters.
                </p>
                <Button variant="secondary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Recently Viewed */}
        <div className="mt-16">
          <RecentlyViewed />
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Filters"
        position="right"
      >
        <FilterSection
          filters={filters}
          availableOptions={availableOptions}
          onUpdateFilter={updateFilter}
          onToggleArrayFilter={toggleArrayFilter}
          onClearFilters={clearFilters}
          isMobile
        />
      </Drawer>
    </div>
  )
}

// Filter Section Component
function FilterSection({
  filters,
  availableOptions,
  onUpdateFilter,
  onToggleArrayFilter,
  onClearFilters,
  isMobile = false,
}: any) {
  const [priceRange, setPriceRange] = useState(filters.priceRange)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    categories: true,
    sizes: false,
    colors: false,
    availability: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handlePriceChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0
    const newRange = [...priceRange] as [number, number]
    newRange[index] = numValue
    setPriceRange(newRange)
  }

  const applyPriceFilter = () => {
    onUpdateFilter('priceRange', priceRange)
  }

  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left font-medium mb-3"
        >
          Price Range
          <span className="text-ink-400">
            {expandedSections.price ? '−' : '+'}
          </span>
        </button>
        {expandedSections.price && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange[0]}
                onChange={(e) => handlePriceChange(0, e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: "var(--ink-200)" }}
              />
              <span className="self-center" style={{ color: "var(--ink-600)" }}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange[1]}
                onChange={(e) => handlePriceChange(1, e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: "var(--ink-200)" }}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={applyPriceFilter}
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      {/* Categories */}
      {availableOptions.categories.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('categories')}
            className="flex items-center justify-between w-full text-left font-medium mb-3"
          >
            Categories
            <span className="text-ink-400">
              {expandedSections.categories ? '−' : '+'}
            </span>
          </button>
          {expandedSections.categories && (
            <div className="space-y-2">
              {availableOptions.categories.map((category: string) => (
                <label key={category} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category)}
                    onChange={() => onToggleArrayFilter('categories', category)}
                    className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                  />
                  <span className="text-sm">{category}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sizes */}
      {availableOptions.sizes.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('sizes')}
            className="flex items-center justify-between w-full text-left font-medium mb-3"
          >
            Sizes
            <span className="text-ink-400">
              {expandedSections.sizes ? '−' : '+'}
            </span>
          </button>
          {expandedSections.sizes && (
            <div className="grid grid-cols-3 gap-2">
              {availableOptions.sizes.map((size: string) => (
                <button
                  key={size}
                  onClick={() => onToggleArrayFilter('sizes', size)}
                  className={`py-2 px-3 text-sm border rounded transition-colors ${
                    filters.sizes.includes(size)
                      ? "bg-maroon-700 text-white border-maroon-700"
                      : "bg-white border-ink-200 hover:border-maroon-700"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Colors */}
      {availableOptions.colors.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('colors')}
            className="flex items-center justify-between w-full text-left font-medium mb-3"
          >
            Colors
            <span className="text-ink-400">
              {expandedSections.colors ? '−' : '+'}
            </span>
          </button>
          {expandedSections.colors && (
            <div className="grid grid-cols-2 gap-2">
              {availableOptions.colors.map((color: string) => (
                <label key={color} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.colors.includes(color)}
                    onChange={() => onToggleArrayFilter('colors', color)}
                    className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                  />
                  <span className="text-sm">{color}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Availability */}
      <div>
        <button
          onClick={() => toggleSection('availability')}
          className="flex items-center justify-between w-full text-left font-medium mb-3"
        >
          Availability
          <span className="text-ink-400">
            {expandedSections.availability ? '−' : '+'}
          </span>
        </button>
        {expandedSections.availability && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => onUpdateFilter('inStock', e.target.checked)}
                className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
              />
              <span className="text-sm">In Stock Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.onSale}
                onChange={(e) => onUpdateFilter('onSale', e.target.checked)}
                className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
              />
              <span className="text-sm">On Sale</span>
            </label>
          </div>
        )}
      </div>

      {/* Actions */}
      {isMobile && (
        <div className="pt-4 border-t" style={{ borderColor: "var(--ink-200)" }}>
          <Button variant="primary" className="w-full mb-2" onClick={applyPriceFilter}>
            Apply Filters
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClearFilters}>
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}
