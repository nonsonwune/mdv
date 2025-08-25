"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useProductFilters, sortOptions } from "../../hooks/useProductFilters"
import { usePagination } from "../../hooks/usePagination"
import ProductCard from "../../components/products/ProductCard"
import { Button, Drawer } from "../../components/ui"
import { Pagination } from "../../components/ui/Pagination"
import { AdvancedFilters } from "../../components/ui/AdvancedFilters"
import type { Product } from "../../lib/types"

interface EnhancedSearchPageProps {
  initialProducts: Product[]
  initialQuery: string
}

export default function EnhancedSearchPage({ initialProducts, initialQuery }: EnhancedSearchPageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchInput, setSearchInput] = useState(initialQuery)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mdv_recent_searches")
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])
  
  // Product filtering
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
  } = useProductFilters(initialProducts)
  
  // Update search query when initialQuery changes
  useEffect(() => {
    setSearchQuery(initialQuery)
    setSearchInput(initialQuery)
  }, [initialQuery, setSearchQuery])
  
  // Pagination
  const pagination = usePagination({
    items: filteredProducts,
    itemsPerPage: 12,
  })
  
  // Reset pagination when filters change
  useEffect(() => {
    pagination.reset()
  }, [filters, sortBy, searchQuery])
  
  // Handle search submit
  const handleSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    
    // Update URL
    const params = new URLSearchParams(searchParams)
    params.set("query", trimmedQuery)
    router.push(`/search?${params.toString()}`)
    
    // Save to recent searches
    const updated = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 10)
    setRecentSearches(updated)
    localStorage.setItem("mdv_recent_searches", JSON.stringify(updated))
    
    setShowSuggestions(false)
  }, [searchParams, router, recentSearches])
  
  // Handle search input changes
  const handleInputChange = (value: string) => {
    setSearchInput(value)
    setShowSuggestions(value.length > 0)
  }
  
  // Generate search suggestions
  const suggestions = useMemo(() => {
    if (!searchInput) return []
    
    const input = searchInput.toLowerCase()
    const fromProducts = Array.from(new Set(
      initialProducts
        .filter(p => 
          p.title?.toLowerCase().includes(input) ||
          p.description?.toLowerCase().includes(input)
        )
        .map(p => p.title)
        .slice(0, 5)
    ))
    
    const fromRecent = recentSearches
      .filter(s => s.toLowerCase().includes(input))
      .slice(0, 3)
    
    return [...fromProducts, ...fromRecent].slice(0, 8)
  }, [searchInput, initialProducts, recentSearches])
  
  const hasActiveFilters = 
    filters.categories.length > 0 ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.inStock ||
    filters.onSale ||
    (filters.priceRange[0] > availableOptions.priceRange[0] || 
     filters.priceRange[1] < availableOptions.priceRange[1])

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--ink-50)" }}>
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--ink-800)" }}>
            Search Products
          </h1>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <form onSubmit={(e) => {
              e.preventDefault()
              handleSearch(searchInput)
            }}>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: "var(--ink-400)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full pl-12 pr-24 py-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                  style={{ borderColor: "var(--ink-200)" }}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  Search
                </Button>
              </div>
            </form>
            
            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg" style={{ borderColor: "var(--ink-200)" }}>
                <div className="py-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchInput(suggestion)
                        handleSearch(suggestion)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" style={{ color: "var(--ink-400)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Recent Searches */}
          {recentSearches.length > 0 && !searchQuery && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2" style={{ color: "var(--ink-600)" }}>Recent searches:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.slice(0, 5).map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchInput(search)
                      handleSearch(search)
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                  >
                    {search}
                  </button>
                ))}
                {recentSearches.length > 5 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("mdv_recent_searches")
                      setRecentSearches([])
                    }}
                    className="px-3 py-1 text-sm text-maroon-700 hover:text-maroon-800"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Header */}
        {searchQuery && (
          <div className="mb-6">
            <p className="text-lg" style={{ color: "var(--ink-700)" }}>
              {filteredCount > 0 ? (
                <>
                  Found <span className="font-semibold">{filteredCount}</span> results for "
                  <span className="font-semibold">{searchQuery}</span>"
                </>
              ) : (
                <>No results found for "<span className="font-semibold">{searchQuery}</span>"</>
              )}
            </p>
          </div>
        )}

        {/* Controls */}
        {filteredCount > 0 && (
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
        )}

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--ink-700)" }}>Active filters:</span>
            
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
          {filteredCount > 0 && (
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
          )}

          {/* Results Grid */}
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
                
                {/* Pagination */}
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  pageNumbers={pagination.pageNumbers}
                  onPageChange={pagination.goToPage}
                  onPreviousPage={pagination.goToPreviousPage}
                  onNextPage={pagination.goToNextPage}
                  className="mt-8"
                />
              </>
            ) : searchQuery ? (
              <div className="text-center py-12">
                <svg className="w-24 h-24 mx-auto mb-4" style={{ color: "var(--ink-300)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg mb-2" style={{ color: "var(--ink-700)" }}>
                  No products found
                </p>
                <p className="text-sm mb-4" style={{ color: "var(--ink-600)" }}>
                  Try adjusting your search or filters
                </p>
                {hasActiveFilters && (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-24 h-24 mx-auto mb-4" style={{ color: "var(--ink-300)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg mb-2" style={{ color: "var(--ink-700)" }}>
                  Start searching
                </p>
                <p className="text-sm" style={{ color: "var(--ink-600)" }}>
                  Enter a search term above to find products
                </p>
              </div>
            )}
          </div>
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

// Filter Section Component (reused from EnhancedCategoryPage)
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
    categories: true,
    price: false,
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
