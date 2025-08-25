"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { debounce } from 'lodash'
import { formatNaira } from '../../lib/format'
import type { Route } from 'next'

interface SearchSuggestion {
  id: string
  type: 'product' | 'category' | 'brand' | 'query'
  title: string
  subtitle?: string
  image?: string
  url: string
  price?: number
  badge?: string
}

interface TrendingSearch {
  query: string
  count: number
  trend: 'up' | 'down' | 'stable'
}

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  showSuggestions?: boolean
  showTrending?: boolean
  variant?: 'default' | 'minimal' | 'expanded'
}

export default function SearchBar({
  placeholder = "Search for products, brands, or categories...",
  onSearch,
  showSuggestions = true,
  showTrending = true,
  variant = 'default'
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([])
  const [popularProducts, setPopularProducts] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    loadInitialData()
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadInitialData = async () => {
    // Load recent searches from localStorage
    const savedSearches = localStorage.getItem('mdv_recent_searches')
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches))
    }

    // Load trending searches from API
    try {
      const response = await fetch('/api/search/trending')
      if (response.ok) {
        const data = await response.json()
        setTrendingSearches(data.trending || [])
      }
    } catch (error) {
      console.error('Failed to load trending searches:', error)
    }

    // Load popular products from API
    try {
      const response = await fetch('/api/search/popular')
      if (response.ok) {
        const data = await response.json()
        setPopularProducts(data.popular || [])
      }
    } catch (error) {
      console.error('Failed to load popular products:', error)
    }
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  const searchProducts = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([])
        return
      }

      setLoading(true)
      
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
        } else {
          // Fallback to basic query suggestion
          setSuggestions([{
            id: 'q1',
            type: 'query',
            title: searchQuery,
            url: `/search?q=${encodeURIComponent(searchQuery)}`
          }])
        }
      } catch (error) {
        console.error('Search error:', error)
        // Fallback to basic query suggestion
        setSuggestions([{
          id: 'q1',
          type: 'query',
          title: searchQuery,
          url: `/search?q=${encodeURIComponent(searchQuery)}`
        }])
      } finally {
        setLoading(false)
      }
    }, 300),
    []
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedIndex(-1)
    
    if (value.length > 0) {
      setIsOpen(true)
      if (showSuggestions) {
        searchProducts(value)
      }
    } else {
      setSuggestions([])
      setIsOpen(showTrending || recentSearches.length > 0)
    }
  }

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query
    
    if (finalQuery.trim()) {
      // Save to recent searches
      saveRecentSearch(finalQuery)
      
      // Close dropdown
      setIsOpen(false)
      
      // Call onSearch callback or navigate
      if (onSearch) {
        onSearch(finalQuery)
      } else {
        router.push(`/search?q=${encodeURIComponent(finalQuery)}` as Route)
      }
    }
  }

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('mdv_recent_searches', JSON.stringify(updated))
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('mdv_recent_searches')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    const totalItems = suggestions.length || 
      (query.length === 0 ? recentSearches.length + trendingSearches.length : 0)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          if (suggestions.length > 0 && selectedIndex < suggestions.length) {
            const selected = suggestions[selectedIndex]
            if (selected.type === 'query') {
              handleSearch(selected.title)
            } else {
              router.push(selected.url as Route)
            }
          } else if (query.length === 0) {
            // Handle recent/trending selection
            if (selectedIndex < recentSearches.length) {
              handleSearch(recentSearches[selectedIndex])
            } else {
              const trendingIndex = selectedIndex - recentSearches.length
              if (trendingIndex < trendingSearches.length) {
                handleSearch(trendingSearches[trendingIndex].query)
              }
            }
          }
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'query':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )
      case 'category':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        )
      case 'brand':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className={`
        relative flex items-center
        ${variant === 'minimal' ? 'bg-neutral-100' : 'bg-white border border-neutral-300'}
        ${variant === 'expanded' ? 'rounded-xl' : 'rounded-lg'}
        ${isOpen ? 'ring-2 ring-maroon-500' : ''}
        transition-all
      `}>
        <div className="absolute left-3 text-neutral-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`
            w-full bg-transparent outline-none
            ${variant === 'expanded' ? 'pl-12 pr-32 py-4' : 'pl-10 pr-24 py-3'}
            text-sm placeholder-neutral-400
          `}
        />
        
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setSuggestions([])
              inputRef.current?.focus()
            }}
            className="absolute right-20 text-neutral-400 hover:text-neutral-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        <button
          onClick={() => handleSearch()}
          className={`
            absolute right-2 bg-maroon-700 text-white rounded-md hover:bg-maroon-800 transition-colors
            ${variant === 'expanded' ? 'px-6 py-2' : 'px-4 py-1.5'}
          `}
        >
          Search
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 max-h-[600px] overflow-y-auto">
          {/* Loading State */}
          {loading && (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-maroon-700"></div>
            </div>
          )}

          {/* Search Suggestions */}
          {!loading && suggestions.length > 0 && (
            <div className="p-2">
              {suggestions.map((suggestion, index) => (
                <Link
                  key={suggestion.id}
                  href={suggestion.url as Route}
                  onClick={() => {
                    if (suggestion.type === 'query') {
                      saveRecentSearch(suggestion.title)
                    }
                    setIsOpen(false)
                  }}
                >
                  <div className={`
                    flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors
                    ${selectedIndex === index ? 'bg-neutral-100' : ''}
                  `}>
                    {suggestion.type === 'product' && suggestion.image ? (
                      <Image
                        src={suggestion.image}
                        alt={suggestion.title}
                        width={40}
                        height={40}
                        className="rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center text-neutral-600">
                        {renderIcon(suggestion.type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{suggestion.title}</p>
                      {suggestion.subtitle && (
                        <p className="text-xs text-neutral-500">{suggestion.subtitle}</p>
                      )}
                    </div>
                    
                    {suggestion.price && (
                      <p className="text-sm font-semibold text-maroon-700">
                        {formatNaira(suggestion.price)}
                      </p>
                    )}
                    
                    {suggestion.badge && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                        {suggestion.badge}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Default View (Recent & Trending) */}
          {!loading && query.length === 0 && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-neutral-700">Recent Searches</h3>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-neutral-500 hover:text-red-600"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(search)}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-50 text-sm flex items-center gap-2
                          ${selectedIndex === index ? 'bg-neutral-100' : ''}
                        `}
                      >
                        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              {showTrending && trendingSearches.length > 0 && (
                <div className="p-4 border-b">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Trending Searches</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {trendingSearches.map((trending, index) => {
                      const adjustedIndex = recentSearches.length + index
                      return (
                        <button
                          key={trending.query}
                          onClick={() => handleSearch(trending.query)}
                          className={`
                            flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-50 text-sm
                            ${selectedIndex === adjustedIndex ? 'bg-neutral-100' : ''}
                          `}
                        >
                          <span className="flex items-center gap-2">
                            {trending.trend === 'up' && (
                              <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              </svg>
                            )}
                            {trending.trend === 'down' && (
                              <svg className="w-3 h-3 text-red-500 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              </svg>
                            )}
                            {trending.trend === 'stable' && (
                              <div className="w-3 h-0.5 bg-neutral-400"></div>
                            )}
                            {trending.query}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {trending.count.toLocaleString()}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Popular Products */}
              {popularProducts.length > 0 && (
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Popular Products</h3>
                  <div className="space-y-2">
                    {popularProducts.map(product => (
                      <Link key={product.id} href={product.url as Route}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer">
                          <Image
                            src={product.image!}
                            alt={product.title}
                            width={48}
                            height={48}
                            className="rounded object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.title}</p>
                            <p className="text-xs text-neutral-500">{product.subtitle}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-maroon-700">
                              {formatNaira(product.price!)}
                            </p>
                            {product.badge && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                                {product.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* No Results */}
          {!loading && query.length > 0 && suggestions.length === 0 && (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-neutral-600 text-sm">No results found for "{query}"</p>
              <p className="text-neutral-400 text-xs mt-1">Try different keywords or browse categories</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
