"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, Card } from "../ui"

interface FilterSidebarProps {
  onClose?: () => void
  isMobile?: boolean
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
const COLORS = [
  { name: "Black", value: "black", hex: "#000000" },
  { name: "White", value: "white", hex: "#FFFFFF" },
  { name: "Gray", value: "gray", hex: "#6B7280" },
  { name: "Red", value: "red", hex: "#DC2626" },
  { name: "Blue", value: "blue", hex: "#2563EB" },
  { name: "Green", value: "green", hex: "#16A34A" },
  { name: "Yellow", value: "yellow", hex: "#EAB308" },
  { name: "Pink", value: "pink", hex: "#EC4899" },
  { name: "Purple", value: "purple", hex: "#9333EA" },
  { name: "Orange", value: "orange", hex: "#EA580C" },
]

const CATEGORIES = [
  { label: "T-Shirts", value: "tshirts" },
  { label: "Shirts", value: "shirts" },
  { label: "Pants", value: "pants" },
  { label: "Dresses", value: "dresses" },
  { label: "Jackets", value: "jackets" },
  { label: "Shoes", value: "shoes" },
  { label: "Accessories", value: "accessories" },
]

export default function FilterSidebar({ onClose, isMobile = false }: FilterSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse filters from URL
  const [priceRange, setPriceRange] = useState({
    min: Number(searchParams.get("minPrice")) || 0,
    max: Number(searchParams.get("maxPrice")) || 100000
  })
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    searchParams.get("sizes")?.split(",").filter(Boolean) || []
  )
  const [selectedColors, setSelectedColors] = useState<string[]>(
    searchParams.get("colors")?.split(",").filter(Boolean) || []
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  )
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get("inStock") === "true"
  )
  const [onSaleOnly, setOnSaleOnly] = useState(
    searchParams.get("onSale") === "true"
  )

  // Track if filters are active
  const hasActiveFilters = 
    priceRange.min > 0 ||
    priceRange.max < 100000 ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    selectedCategories.length > 0 ||
    inStockOnly ||
    onSaleOnly

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Price range
    if (priceRange.min > 0) params.set("minPrice", priceRange.min.toString())
    else params.delete("minPrice")
    
    if (priceRange.max < 100000) params.set("maxPrice", priceRange.max.toString())
    else params.delete("maxPrice")
    
    // Sizes
    if (selectedSizes.length > 0) params.set("sizes", selectedSizes.join(","))
    else params.delete("sizes")
    
    // Colors
    if (selectedColors.length > 0) params.set("colors", selectedColors.join(","))
    else params.delete("colors")
    
    // Categories
    if (selectedCategories.length > 0) params.set("categories", selectedCategories.join(","))
    else params.delete("categories")
    
    // Stock & Sale
    if (inStockOnly) params.set("inStock", "true")
    else params.delete("inStock")
    
    if (onSaleOnly) params.set("onSale", "true")
    else params.delete("onSale")
    
    // Reset to page 1 when filters change
    params.delete("page")
    
    // Update URL
    router.push(`?${params.toString()}`)
    
    // Close mobile sidebar if applicable
    if (isMobile && onClose) {
      onClose()
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setPriceRange({ min: 0, max: 100000 })
    setSelectedSizes([])
    setSelectedColors([])
    setSelectedCategories([])
    setInStockOnly(false)
    setOnSaleOnly(false)
    
    // Clear URL params
    const params = new URLSearchParams(searchParams.toString())
    params.delete("minPrice")
    params.delete("maxPrice")
    params.delete("sizes")
    params.delete("colors")
    params.delete("categories")
    params.delete("inStock")
    params.delete("onSale")
    params.delete("page")
    
    const url = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.push(url as any)
  }

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    )
  }

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    )
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  return (
    <div className={`${isMobile ? "" : "sticky top-24"} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-maroon-700 hover:text-maroon-800"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Price Range */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Price Range</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">₦</span>
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min || ""}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
              className="input text-sm"
              min="0"
            />
            <span className="text-neutral-400">—</span>
            <span className="text-sm text-neutral-600">₦</span>
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max === 100000 ? "" : priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) || 100000 }))}
              className="input text-sm"
              min="0"
            />
          </div>
          <div className="text-xs text-neutral-600">
            ₦{priceRange.min.toLocaleString()} - ₦{priceRange.max.toLocaleString()}
          </div>
        </div>
      </Card>

      {/* Categories */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Categories</h3>
        <div className="space-y-2">
          {CATEGORIES.map(category => (
            <label key={category.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category.value)}
                onChange={() => toggleCategory(category.value)}
                className="rounded border-neutral-300 text-maroon-700 focus:ring-maroon-700"
              />
              <span className="text-sm">{category.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Sizes */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Size</h3>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map(size => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`py-2 px-3 text-sm border rounded transition-colors ${
                selectedSizes.includes(size)
                  ? "bg-maroon-700 text-white border-maroon-700"
                  : "bg-white border-neutral-300 hover:border-maroon-700"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Card>

      {/* Colors */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Color</h3>
        <div className="grid grid-cols-5 gap-2">
          {COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => toggleColor(color.value)}
              className={`group relative w-10 h-10 rounded-full border-2 transition-all ${
                selectedColors.includes(color.value)
                  ? "border-maroon-700 scale-110"
                  : "border-neutral-300 hover:border-neutral-400"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {selectedColors.includes(color.value) && (
                <svg
                  className="absolute inset-0 m-auto w-5 h-5"
                  fill={color.value === "white" ? "black" : "white"}
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="sr-only">{color.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Availability */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Availability</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded border-neutral-300 text-maroon-700 focus:ring-maroon-700"
            />
            <span className="text-sm">In Stock Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={(e) => setOnSaleOnly(e.target.checked)}
              className="rounded border-neutral-300 text-maroon-700 focus:ring-maroon-700"
            />
            <span className="text-sm">On Sale</span>
          </label>
        </div>
      </Card>

      {/* Apply Button */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={applyFilters}
        >
          Apply Filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="secondary"
            onClick={clearFilters}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="text-xs text-neutral-600">
          <p className="font-medium mb-1">Active filters:</p>
          <div className="flex flex-wrap gap-1">
            {priceRange.min > 0 && (
              <span className="bg-neutral-100 px-2 py-1 rounded">
                Min: ₦{priceRange.min.toLocaleString()}
              </span>
            )}
            {priceRange.max < 100000 && (
              <span className="bg-neutral-100 px-2 py-1 rounded">
                Max: ₦{priceRange.max.toLocaleString()}
              </span>
            )}
            {selectedSizes.map(size => (
              <span key={size} className="bg-neutral-100 px-2 py-1 rounded">
                Size: {size}
              </span>
            ))}
            {selectedColors.map(color => (
              <span key={color} className="bg-neutral-100 px-2 py-1 rounded">
                Color: {color}
              </span>
            ))}
            {inStockOnly && (
              <span className="bg-neutral-100 px-2 py-1 rounded">In Stock</span>
            )}
            {onSaleOnly && (
              <span className="bg-neutral-100 px-2 py-1 rounded">On Sale</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
