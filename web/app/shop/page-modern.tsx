"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { useDebounce } from 'use-debounce'
import { API_BASE } from '../../lib/api'
import { formatNaira } from '../../lib/format'
import type { Product } from '../../lib/types'

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const MicIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
)

const CameraIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
)

const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const ListIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const HeartIcon = ({ filled = false }) => (
  <svg className={`w-5 h-5 ${filled ? 'fill-current text-red-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const StarIcon = ({ filled = false }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

interface FilterState {
  categories: string[]
  priceRange: [number, number]
  sizes: string[]
  colors: string[]
  ratings: number
  sortBy: string
}

export default function ModernShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebounce(searchQuery, 300)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [wishlist, setWishlist] = useState<Set<number>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { scrollY } = useScroll()
  const [isScrolled, setIsScrolled] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: [0, 500000],
    sizes: [],
    colors: [],
    ratings: 0,
    sortBy: 'relevance'
  })

  const categories = ['Men', 'Women', 'Accessories', 'Shoes', 'Bags', 'Watches']
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  const colors = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Gray', hex: '#6B7280' },
    { name: 'Red', hex: '#EF4444' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Green', hex: '#10B981' },
    { name: 'Yellow', hex: '#F59E0B' },
    { name: 'Purple', hex: '#8B5CF6' }
  ]

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest First' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' }
  ]

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50)
  })

  useEffect(() => {
    loadProducts()
    loadWishlist()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [products, filters, debouncedSearch])

  useEffect(() => {
    if (debouncedSearch) {
      generateSearchSuggestions(debouncedSearch)
    } else {
      setSearchSuggestions([])
    }
  }, [debouncedSearch])

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/products?page_size=50`)
      const data = await res.json()
      setProducts(data.items || [])
      setFilteredProducts(data.items || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  function loadWishlist() {
    const saved = localStorage.getItem('mdv_wishlist')
    if (saved) {
      setWishlist(new Set(JSON.parse(saved)))
    }
  }

  function toggleWishlist(productId: number) {
    setWishlist(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      localStorage.setItem('mdv_wishlist', JSON.stringify(Array.from(newSet)))
      return newSet
    })
  }

  function applyFilters() {
    let filtered = [...products]

    // Search filter
    if (debouncedSearch) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => 
        filters.categories.some(cat => 
          p.title.toLowerCase().includes(cat.toLowerCase()) ||
          p.description?.toLowerCase().includes(cat.toLowerCase())
        )
      )
    }

    // Price filter
    filtered = filtered.filter(p => {
      const price = p.variants?.[0]?.price || 0
      return price >= filters.priceRange[0] && price <= filters.priceRange[1]
    })

    // Sort
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0))
        break
      case 'price-high':
        filtered.sort((a, b) => (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0))
        break
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      default:
        break
    }

    setFilteredProducts(filtered)
  }

  function generateSearchSuggestions(query: string) {
    const suggestions = [
      `${query} for men`,
      `${query} for women`,
      `${query} on sale`,
      `best ${query}`,
      `premium ${query}`
    ]
    setSearchSuggestions(suggestions)
  }

  function handleVoiceSearch() {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser')
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setVoiceSearchActive(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setSearchQuery(transcript)
      setVoiceSearchActive(false)
    }

    recognition.onerror = () => {
      setVoiceSearchActive(false)
    }

    recognition.onend = () => {
      setVoiceSearchActive(false)
    }

    recognition.start()
  }

  function updateFilter(key: keyof FilterState, value: any) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearAllFilters() {
    setFilters({
      categories: [],
      priceRange: [0, 500000],
      sizes: [],
      colors: [],
      ratings: 0,
      sortBy: 'relevance'
    })
    setSearchQuery('')
  }

  const activeFiltersCount = 
    filters.categories.length + 
    filters.sizes.length + 
    filters.colors.length + 
    (filters.ratings > 0 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 500000 ? 1 : 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Advanced Search Bar */}
      <motion.div 
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg' : 'bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-4 items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search for products, brands, categories..."
                  className="w-full pl-12 pr-24 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <SearchIcon />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon />
                </div>
                
                {/* Voice & Visual Search */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleVoiceSearch}
                    className={`p-2 rounded-full transition-colors ${
                      voiceSearchActive 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <MicIcon />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                  >
                    <CameraIcon />
                  </motion.button>
                </div>
              </div>

              {/* Search Suggestions */}
              <AnimatePresence>
                {showSuggestions && searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                  >
                    {searchSuggestions.map((suggestion, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          setSearchQuery(suggestion)
                          setShowSuggestions(false)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-3"
                      >
                        <SearchIcon />
                        <span>{suggestion}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Filter Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterSidebarOpen(true)}
              className="relative p-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-colors"
            >
              <FilterIcon />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </motion.button>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-purple-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GridIcon />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-purple-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ListIcon />
              </button>
            </div>
          </div>

          {/* Active Filters Pills */}
          {activeFiltersCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 mt-4 flex-wrap"
            >
              {filters.categories.map(cat => (
                <span key={cat} className="badge-modern bg-purple-100 text-purple-700">
                  {cat}
                  <button
                    onClick={() => updateFilter('categories', filters.categories.filter(c => c !== cat))}
                    className="ml-2 hover:text-purple-900"
                  >
                    ×
                  </button>
                </span>
              ))}
              {(filters.priceRange[0] > 0 || filters.priceRange[1] < 500000) && (
                <span className="badge-modern bg-green-100 text-green-700">
                  {formatNaira(filters.priceRange[0])} - {formatNaira(filters.priceRange[1])}
                  <button
                    onClick={() => updateFilter('priceRange', [0, 500000])}
                    className="ml-2 hover:text-green-900"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="badge-modern bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Results Header */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {searchQuery ? `Search results for "${searchQuery}"` : 'All Products'}
            </h1>
            <p className="text-gray-600">
              {filteredProducts.length} products found
            </p>
          </div>
          
          {/* Sort Dropdown */}
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid/List */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {loading ? (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className={`skeleton ${viewMode === 'grid' ? 'h-80' : 'h-48'} rounded-2xl`} />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold mb-2">No products found</h2>
            <p className="text-gray-600 mb-6">Try adjusting your filters or search query</p>
            <button
              onClick={clearAllFilters}
              className="btn-modern"
            >
              Clear Filters
            </button>
          </motion.div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  viewMode={viewMode}
                  isWishlisted={wishlist.has(product.id)}
                  onToggleWishlist={() => toggleWishlist(product.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Filter Sidebar */}
      <AnimatePresence>
        {filterSidebarOpen && (
          <FilterSidebar
            filters={filters}
            updateFilter={updateFilter}
            clearAllFilters={clearAllFilters}
            onClose={() => setFilterSidebarOpen(false)}
            categories={categories}
            sizes={sizes}
            colors={colors}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Product Card Component
function ProductCard({ product, index, viewMode, isWishlisted, onToggleWishlist }) {
  const [imageLoaded, setImageLoaded] = useState(false)

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex gap-4">
          <div className="relative w-48 h-48 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden">
            {!imageLoaded && <div className="skeleton absolute inset-0" />}
            {product.images?.[0] && (
              <Image
                src={product.images[0].url}
                alt={product.title}
                fill
                className={`object-cover transition-opacity ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
            )}
          </div>
          
          <div className="flex-1 py-4">
            <div className="flex justify-between items-start">
              <div>
                <Link href={`/product/${product.slug}`}>
                  <h3 className="text-xl font-semibold mb-2 hover:text-purple-600 transition-colors">
                    {product.title}
                  </h3>
                </Link>
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} filled={i < 4} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">(4.5)</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {formatNaira(product.variants?.[0]?.price || 0)}
                </div>
                {product.compare_at_price && (
                  <div className="text-sm text-gray-400 line-through">
                    {formatNaira(product.compare_at_price)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button className="btn-modern py-2 px-6">
                Add to Cart
              </button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggleWishlist}
                className={`p-2 rounded-full transition-colors ${
                  isWishlisted
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <HeartIcon filled={isWishlisted} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <div className="glass-card overflow-hidden group cursor-pointer">
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleWishlist}
            className={`absolute top-4 right-4 z-10 p-2 rounded-full backdrop-blur-md transition-all ${
              isWishlisted 
                ? 'bg-red-500 text-white' 
                : 'bg-white/80 text-gray-700 hover:bg-white'
            }`}
          >
            <HeartIcon filled={isWishlisted} />
          </motion.button>

          {product.compare_at_price && (
            <div className="absolute top-4 left-4 z-10">
              <span className="badge-modern bg-gradient-to-r from-red-500 to-pink-500">
                {Math.round(((product.compare_at_price - product.variants[0]?.price) / product.compare_at_price) * 100)}% OFF
              </span>
            </div>
          )}

          <Link href={`/product/${product.slug}`}>
            <div className="relative w-full h-full">
              {!imageLoaded && <div className="skeleton absolute inset-0" />}
              {product.images?.[0] && (
                <Image
                  src={product.images[0].url}
                  alt={product.title}
                  fill
                  className={`object-cover transition-all duration-700 group-hover:scale-110 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <button className="w-full btn-modern py-2 text-sm">
                  Quick Add to Cart
                </button>
              </div>
            </div>
          </Link>
        </div>

        <div className="p-4">
          <Link href={`/product/${product.slug}`}>
            <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-purple-600 transition-colors">
              {product.title}
            </h3>
          </Link>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-1">
            {product.description}
          </p>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} filled={i < 4} />
              ))}
            </div>
            <span className="text-xs text-gray-500">(4.5)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-purple-600">
              {formatNaira(product.variants?.[0]?.price || 0)}
            </span>
            {product.compare_at_price && (
              <span className="text-sm text-gray-400 line-through">
                {formatNaira(product.compare_at_price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Filter Sidebar Component
function FilterSidebar({ filters, updateFilter, clearAllFilters, onClose, categories, sizes, colors }) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Sidebar */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Categories */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(cat)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFilter('categories', [...filters.categories, cat])
                      } else {
                        updateFilter('categories', filters.categories.filter(c => c !== cat))
                      }
                    }}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Price Range</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="number"
                  value={filters.priceRange[0]}
                  onChange={(e) => updateFilter('priceRange', [Number(e.target.value), filters.priceRange[1]])}
                  placeholder="Min"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="number"
                  value={filters.priceRange[1]}
                  onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], Number(e.target.value)])}
                  placeholder="Max"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="relative pt-2">
                <input
                  type="range"
                  min="0"
                  max="500000"
                  value={filters.priceRange[1]}
                  onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], Number(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>{formatNaira(0)}</span>
                  <span>{formatNaira(500000)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Sizes</h3>
            <div className="grid grid-cols-3 gap-2">
              {sizes.map(size => (
                <button
                  key={size}
                  onClick={() => {
                    if (filters.sizes.includes(size)) {
                      updateFilter('sizes', filters.sizes.filter(s => s !== size))
                    } else {
                      updateFilter('sizes', [...filters.sizes, size])
                    }
                  }}
                  className={`py-2 px-4 border-2 rounded-lg transition-all ${
                    filters.sizes.includes(size)
                      ? 'border-purple-600 bg-purple-50 text-purple-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Colors</h3>
            <div className="grid grid-cols-4 gap-3">
              {colors.map(color => (
                <button
                  key={color.name}
                  onClick={() => {
                    if (filters.colors.includes(color.name)) {
                      updateFilter('colors', filters.colors.filter(c => c !== color.name))
                    } else {
                      updateFilter('colors', [...filters.colors, color.name])
                    }
                  }}
                  className={`relative w-full aspect-square rounded-lg border-2 transition-all ${
                    filters.colors.includes(color.name)
                      ? 'border-purple-600 scale-110'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {filters.colors.includes(color.name) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Ratings */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Minimum Rating</h3>
            <div className="space-y-2">
              {[4, 3, 2, 1].map(rating => (
                <button
                  key={rating}
                  onClick={() => updateFilter('ratings', rating)}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors w-full ${
                    filters.ratings === rating
                      ? 'bg-purple-50 text-purple-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} filled={i < rating} />
                    ))}
                  </div>
                  <span className="text-sm">& up</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Apply/Clear Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex gap-4">
          <button
            onClick={clearAllFilters}
            className="flex-1 btn-float"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 btn-modern"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </>
  )
}
