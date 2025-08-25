"use client"

import { useState, useEffect } from 'react'
import { Card, Button, Badge, Toggle, Slider } from '../ui'
import { formatNaira } from '../../lib/format'

interface FilterOption {
  id: string
  label: string
  count: number
  selected?: boolean
}

interface PriceRange {
  min: number
  max: number
}

interface Filters {
  categories: string[]
  brands: string[]
  priceRange: PriceRange
  sizes: string[]
  colors: string[]
  materials: string[]
  ratings: number[]
  availability: string[]
  discounts: string[]
  tags: string[]
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: Filters) => void
  totalResults?: number
  showMobileToggle?: boolean
}

export default function AdvancedFilters({
  onFiltersChange,
  totalResults = 0,
  showMobileToggle = true
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 500000 },
    sizes: [],
    colors: [],
    materials: [],
    ratings: [],
    availability: [],
    discounts: [],
    tags: []
  })

  const [tempPriceRange, setTempPriceRange] = useState<PriceRange>({ min: 0, max: 500000 })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    price: true,
    size: true,
    color: true,
    material: false,
    rating: false,
    availability: false,
    discount: false
  })

  // Filter options (mock data)
  const filterOptions = {
    categories: [
      { id: 'women', label: "Women's Fashion", count: 1234 },
      { id: 'men', label: "Men's Fashion", count: 987 },
      { id: 'kids', label: "Kids & Baby", count: 456 },
      { id: 'accessories', label: 'Accessories', count: 789 },
      { id: 'shoes', label: 'Shoes', count: 654 },
      { id: 'bags', label: 'Bags', count: 321 }
    ],
    brands: [
      { id: 'nike', label: 'Nike', count: 234 },
      { id: 'adidas', label: 'Adidas', count: 189 },
      { id: 'zara', label: 'Zara', count: 156 },
      { id: 'hm', label: 'H&M', count: 145 },
      { id: 'gucci', label: 'Gucci', count: 89 },
      { id: 'prada', label: 'Prada', count: 67 },
      { id: 'versace', label: 'Versace', count: 45 },
      { id: 'local', label: 'Local Brands', count: 234 }
    ],
    sizes: [
      { id: 'xs', label: 'XS', count: 123 },
      { id: 's', label: 'S', count: 234 },
      { id: 'm', label: 'M', count: 345 },
      { id: 'l', label: 'L', count: 321 },
      { id: 'xl', label: 'XL', count: 210 },
      { id: 'xxl', label: 'XXL', count: 98 }
    ],
    colors: [
      { id: 'black', label: 'Black', hex: '#000000', count: 456 },
      { id: 'white', label: 'White', hex: '#FFFFFF', count: 432 },
      { id: 'blue', label: 'Blue', hex: '#0000FF', count: 321 },
      { id: 'red', label: 'Red', hex: '#FF0000', count: 234 },
      { id: 'green', label: 'Green', hex: '#00FF00', count: 189 },
      { id: 'yellow', label: 'Yellow', hex: '#FFFF00', count: 156 },
      { id: 'pink', label: 'Pink', hex: '#FFC0CB', count: 145 },
      { id: 'gray', label: 'Gray', hex: '#808080', count: 198 },
      { id: 'brown', label: 'Brown', hex: '#964B00', count: 167 },
      { id: 'purple', label: 'Purple', hex: '#800080', count: 134 }
    ],
    materials: [
      { id: 'cotton', label: 'Cotton', count: 543 },
      { id: 'polyester', label: 'Polyester', count: 432 },
      { id: 'silk', label: 'Silk', count: 123 },
      { id: 'wool', label: 'Wool', count: 98 },
      { id: 'leather', label: 'Leather', count: 87 },
      { id: 'denim', label: 'Denim', count: 234 },
      { id: 'linen', label: 'Linen', count: 156 }
    ],
    availability: [
      { id: 'in-stock', label: 'In Stock', count: 2345 },
      { id: 'pre-order', label: 'Pre-order', count: 123 },
      { id: 'coming-soon', label: 'Coming Soon', count: 45 }
    ],
    discounts: [
      { id: '10', label: '10% off & above', count: 234 },
      { id: '20', label: '20% off & above', count: 189 },
      { id: '30', label: '30% off & above', count: 145 },
      { id: '40', label: '40% off & above', count: 98 },
      { id: '50', label: '50% off & above', count: 67 }
    ]
  }

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleFilter = (filterType: keyof Filters, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterType] as string[]
      const updated = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      return {
        ...prev,
        [filterType]: updated
      }
    })
  }

  const toggleRating = (rating: number) => {
    setFilters(prev => ({
      ...prev,
      ratings: prev.ratings.includes(rating)
        ? prev.ratings.filter(r => r !== rating)
        : [...prev.ratings, rating]
    }))
  }

  const applyPriceFilter = () => {
    setFilters(prev => ({
      ...prev,
      priceRange: tempPriceRange
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      brands: [],
      priceRange: { min: 0, max: 500000 },
      sizes: [],
      colors: [],
      materials: [],
      ratings: [],
      availability: [],
      discounts: [],
      tags: []
    })
    setTempPriceRange({ min: 0, max: 500000 })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    count += filters.categories.length
    count += filters.brands.length
    count += filters.sizes.length
    count += filters.colors.length
    count += filters.materials.length
    count += filters.ratings.length
    count += filters.availability.length
    count += filters.discounts.length
    count += filters.tags.length
    if (filters.priceRange.min > 0 || filters.priceRange.max < 500000) count++
    return count
  }

  const activeCount = getActiveFiltersCount()

  return (
    <>
      {/* Mobile Filter Toggle */}
      {showMobileToggle && (
        <div className="lg:hidden mb-4">
          <Button
            variant="secondary"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeCount > 0 && (
                <Badge variant="primary" size="sm">{activeCount}</Badge>
              )}
            </span>
            <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>
      )}

      {/* Filters Panel */}
      <div className={`${showMobileToggle && !isOpen ? 'hidden lg:block' : 'block'}`}>
        <Card className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filters</h3>
            {activeCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-maroon-700 hover:underline"
              >
                Clear all ({activeCount})
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('category')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Categories</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.category ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.category && (
              <div className="space-y-2">
                {filterOptions.categories.map(option => (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(option.id)}
                      onChange={() => toggleFilter('categories', option.id)}
                      className="w-4 h-4 text-maroon-700 rounded"
                    />
                    <span className="text-sm flex-1">{option.label}</span>
                    <span className="text-xs text-neutral-500">({option.count})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Brands */}
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('brand')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Brands</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.brand ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.brand && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filterOptions.brands.map(option => (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.brands.includes(option.id)}
                      onChange={() => toggleFilter('brands', option.id)}
                      className="w-4 h-4 text-maroon-700 rounded"
                    />
                    <span className="text-sm flex-1">{option.label}</span>
                    <span className="text-xs text-neutral-500">({option.count})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Price Range */}
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Price Range</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.price && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempPriceRange.min}
                    onChange={(e) => setTempPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    placeholder="Min"
                    className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                  />
                  <span className="text-neutral-500">-</span>
                  <input
                    type="number"
                    value={tempPriceRange.max}
                    onChange={(e) => setTempPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    placeholder="Max"
                    className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                  />
                </div>
                <div className="text-center">
                  <span className="text-sm text-neutral-600">
                    {formatNaira(tempPriceRange.min)} - {formatNaira(tempPriceRange.max)}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={applyPriceFilter}
                  className="w-full"
                >
                  Apply Price Filter
                </Button>
              </div>
            )}
          </div>

          {/* Sizes */}
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('size')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Sizes</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.size ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.size && (
              <div className="grid grid-cols-3 gap-2">
                {filterOptions.sizes.map(option => (
                  <button
                    key={option.id}
                    onClick={() => toggleFilter('sizes', option.id)}
                    className={`
                      px-3 py-2 text-sm rounded border transition-colors
                      ${filters.sizes.includes(option.id)
                        ? 'bg-maroon-700 text-white border-maroon-700'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-maroon-500'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('color')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Colors</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.color ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.color && (
              <div className="grid grid-cols-5 gap-2">
                {filterOptions.colors.map(option => (
                  <button
                    key={option.id}
                    onClick={() => toggleFilter('colors', option.id)}
                    className="group relative"
                    title={option.label}
                  >
                    <div 
                      className={`
                        w-10 h-10 rounded-full border-2 transition-all
                        ${filters.colors.includes(option.id)
                          ? 'border-maroon-700 scale-110'
                          : 'border-neutral-300 hover:border-neutral-400'
                        }
                      `}
                      style={{ backgroundColor: option.hex }}
                    />
                    {filters.colors.includes(option.id) && (
                      <svg className="absolute inset-0 w-full h-full p-2 text-white drop-shadow-lg" 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Materials */}
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('material')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Materials</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.material ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.material && (
              <div className="space-y-2">
                {filterOptions.materials.map(option => (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.materials.includes(option.id)}
                      onChange={() => toggleFilter('materials', option.id)}
                      className="w-4 h-4 text-maroon-700 rounded"
                    />
                    <span className="text-sm flex-1">{option.label}</span>
                    <span className="text-xs text-neutral-500">({option.count})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Ratings */}
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('rating')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Customer Ratings</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.rating ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.rating && (
              <div className="space-y-2">
                {[4, 3, 2, 1].map(rating => (
                  <button
                    key={rating}
                    onClick={() => toggleRating(rating)}
                    className={`
                      w-full flex items-center gap-2 p-2 rounded transition-colors
                      ${filters.ratings.includes(rating)
                        ? 'bg-maroon-50 border border-maroon-300'
                        : 'hover:bg-neutral-50'
                      }
                    `}
                  >
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-500' : 'text-neutral-300'}`}
                          fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-sm ml-1">& up</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('availability')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Availability</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.availability ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.availability && (
              <div className="space-y-2">
                {filterOptions.availability.map(option => (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.availability.includes(option.id)}
                      onChange={() => toggleFilter('availability', option.id)}
                      className="w-4 h-4 text-maroon-700 rounded"
                    />
                    <span className="text-sm flex-1">{option.label}</span>
                    <span className="text-xs text-neutral-500">({option.count})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Discounts */}
          <div className="pb-4">
            <button
              onClick={() => toggleSection('discount')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-medium text-sm">Discounts</h4>
              <svg className={`w-4 h-4 transition-transform ${expandedSections.discount ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.discount && (
              <div className="space-y-2">
                {filterOptions.discounts.map(option => (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.discounts.includes(option.id)}
                      onChange={() => toggleFilter('discounts', option.id)}
                      className="w-4 h-4 text-maroon-700 rounded"
                    />
                    <span className="text-sm flex-1">{option.label}</span>
                    <span className="text-xs text-neutral-500">({option.count})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Results Count */}
          {totalResults > 0 && (
            <div className="pt-4 border-t text-center">
              <p className="text-sm text-neutral-600">
                Showing <span className="font-semibold">{totalResults}</span> results
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
