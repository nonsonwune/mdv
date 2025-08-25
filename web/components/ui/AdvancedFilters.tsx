import { useEffect, useState } from 'react'

interface FilterOption {
  id: string
  label: string
  count: number
  hex?: string
}

interface FilterData {
  categories: FilterOption[]
  brands: FilterOption[]
  sizes: FilterOption[]
  colors: FilterOption[]
  materials: FilterOption[]
  availability: FilterOption[]
  discounts: FilterOption[]
}

interface FilterState {
  categories: string[]
  brands: string[]
  sizes: string[]
  colors: string[]
  materials: string[]
  availability: string[]
  discounts: string[]
  priceRange: [number, number]
}

interface AdvancedFiltersProps {
  onFiltersChange?: (filters: FilterState) => void
  isOpen: boolean
  onToggle: () => void
}

export const AdvancedFilters = ({ onFiltersChange, isOpen, onToggle }: AdvancedFiltersProps) => {
  const [filterData, setFilterData] = useState<FilterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    brands: false,
    sizes: false,
    colors: false,
    price: false,
    materials: false,
    availability: false,
    discounts: false,
  })

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    brands: [],
    sizes: [],
    colors: [],
    materials: [],
    availability: [],
    discounts: [],
    priceRange: [0, 10000],
  })

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/products/filters')
        if (!response.ok) {
          throw new Error('Failed to fetch filter data')
        }
        const data = await response.json()
        setFilterData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchFilterData()
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleFilterChange = (filterType: keyof FilterState, value: string, checked: boolean) => {
    const newFilters = { ...filters }
    
    if (filterType === 'priceRange') return

    const filterArray = newFilters[filterType] as string[]
    
    if (checked) {
      if (!filterArray.includes(value)) {
        filterArray.push(value)
      }
    } else {
      const index = filterArray.indexOf(value)
      if (index > -1) {
        filterArray.splice(index, 1)
      }
    }

    setFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const handlePriceRangeChange = (min: number, max: number) => {
    const newFilters = { ...filters, priceRange: [min, max] as [number, number] }
    setFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      categories: [],
      brands: [],
      sizes: [],
      colors: [],
      materials: [],
      availability: [],
      discounts: [],
      priceRange: [0, 10000],
    }
    setFilters(clearedFilters)
    onFiltersChange?.(clearedFilters)
  }

  const getTotalActiveFilters = () => {
    return filters.categories.length + 
           filters.brands.length + 
           filters.sizes.length + 
           filters.colors.length + 
           filters.materials.length + 
           filters.availability.length + 
           filters.discounts.length
  }

  const renderFilterSection = (
    title: string,
    sectionKey: string,
    options: FilterOption[] = [],
    filterType: keyof FilterState,
    showColors = false
  ) => {
    const isExpanded = expandedSections[sectionKey]
    const activeFilters = filters[filterType] as string[]

    return (
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full py-2 text-left font-medium text-gray-900 hover:text-gray-700"
        >
          <span className="flex items-center">
            {title}
            {activeFilters.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                {activeFilters.length}
              </span>
            )}
          </span>
          <span className="text-gray-400">{isExpanded ? '−' : '+'}</span>
        </button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
            {options.map((option) => (
              <label key={option.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={activeFilters.includes(option.id)}
                  onChange={(e) => handleFilterChange(filterType, option.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                {showColors && option.hex && (
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: option.hex }}
                  />
                )}
                <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                <span className="text-xs text-gray-500">({option.count})</span>
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`${isOpen ? 'block' : 'hidden'} lg:block bg-white p-4 rounded-lg shadow-sm border`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium">Filters</span>
        </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-3 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${isOpen ? 'block' : 'hidden'} lg:block bg-white p-4 rounded-lg shadow-sm border`}>
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Failed to load filters</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!filterData) return null

  const totalActiveFilters = getTotalActiveFilters()

  return (
    <div className={`${isOpen ? 'block' : 'hidden'} lg:block bg-white p-4 rounded-lg shadow-sm border`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium">Filters</span>
          {totalActiveFilters > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
              {totalActiveFilters}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {totalActiveFilters > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          )}
          <button onClick={onToggle} className="lg:hidden">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {renderFilterSection('Category', 'categories', filterData.categories, 'categories')}
        {renderFilterSection('Brand', 'brands', filterData.brands, 'brands')}
        {renderFilterSection('Size', 'sizes', filterData.sizes, 'sizes')}
        {renderFilterSection('Color', 'colors', filterData.colors, 'colors', true)}
        
        {/* Price Range */}
        <div className="border-b border-gray-200 pb-4">
          <button
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full py-2 text-left font-medium text-gray-900 hover:text-gray-700"
          >
            <span>Price Range</span>
            <span className="text-gray-400">{expandedSections.price ? '−' : '+'}</span>
          </button>
          
          {expandedSections.price && (
            <div className="mt-2 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange[0]}
                  onChange={(e) => handlePriceRangeChange(Number(e.target.value), filters.priceRange[1])}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange[1]}
                  onChange={(e) => handlePriceRangeChange(filters.priceRange[0], Number(e.target.value))}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">NGN</span>
              </div>
              <div className="text-xs text-gray-500">
                ₦{filters.priceRange[0].toLocaleString()} - ₦{filters.priceRange[1].toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {renderFilterSection('Material', 'materials', filterData.materials, 'materials')}
        {renderFilterSection('Availability', 'availability', filterData.availability, 'availability')}
        {renderFilterSection('Discounts', 'discounts', filterData.discounts, 'discounts')}
      </div>
    </div>
  )
}
