"use client"

import { useState, useMemo, useCallback } from "react"
import type { Product } from "../lib/types"

export interface FilterOptions {
  priceRange: [number, number]
  categories: string[]
  sizes: string[]
  colors: string[]
  inStock: boolean
  onSale: boolean
}

export interface SortOption {
  value: string
  label: string
}

export const sortOptions: SortOption[] = [
  { value: "best-selling", label: "Best Selling" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
]

export function useProductFilters(products: Product[]) {
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 1000],
    categories: [],
    sizes: [],
    colors: [],
    inStock: false,
    onSale: false,
  })

  const [sortBy, setSortBy] = useState<string>("best-selling")
  const [searchQuery, setSearchQuery] = useState("")

  // Extract available options from products
  const availableOptions = useMemo(() => {
    const categories = new Set<string>()
    const sizes = new Set<string>()
    const colors = new Set<string>()
    let minPrice = Infinity
    let maxPrice = 0

    products.forEach(product => {
      // Get price from first variant
      const price = product.variants?.[0]?.price || 0
      minPrice = Math.min(minPrice, price)
      maxPrice = Math.max(maxPrice, price)

      // Extract category from product title or tags
      if (product.title) {
        // Simple category extraction based on common patterns
        if (product.title.toLowerCase().includes("shirt")) categories.add("Shirts")
        if (product.title.toLowerCase().includes("pant") || product.title.toLowerCase().includes("trouser")) categories.add("Pants")
        if (product.title.toLowerCase().includes("dress")) categories.add("Dresses")
        if (product.title.toLowerCase().includes("jacket") || product.title.toLowerCase().includes("coat")) categories.add("Outerwear")
        if (product.title.toLowerCase().includes("shoe") || product.title.toLowerCase().includes("sneaker")) categories.add("Shoes")
      }

      // Extract sizes and colors from variants
      product.variants?.forEach(variant => {
        if (variant.size) sizes.add(variant.size)
        if (variant.color) colors.add(variant.color)
      })
    })

    return {
      categories: Array.from(categories).sort(),
      sizes: Array.from(sizes).sort((a, b) => {
        // Sort sizes in a logical order
        const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL"]
        const aIndex = sizeOrder.indexOf(a)
        const bIndex = sizeOrder.indexOf(b)
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        return a.localeCompare(b)
      }),
      colors: Array.from(colors).sort(),
      priceRange: [Math.floor(minPrice), Math.ceil(maxPrice)] as [number, number],
    }
  }, [products])

  // Filter products based on current filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const price = product.variants?.[0]?.price || 0
      const isOnSale = product.compare_at_price && product.compare_at_price > price
      // Assume all products are in stock unless we have inventory data
      const hasStock = true

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          product.title?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Price range filter
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
        return false
      }

      // Category filter
      if (filters.categories.length > 0) {
        const productCategories: string[] = []
        if (product.title?.toLowerCase().includes("shirt")) productCategories.push("Shirts")
        if (product.title?.toLowerCase().includes("pant") || product.title?.toLowerCase().includes("trouser")) productCategories.push("Pants")
        if (product.title?.toLowerCase().includes("dress")) productCategories.push("Dresses")
        if (product.title?.toLowerCase().includes("jacket") || product.title?.toLowerCase().includes("coat")) productCategories.push("Outerwear")
        if (product.title?.toLowerCase().includes("shoe") || product.title?.toLowerCase().includes("sneaker")) productCategories.push("Shoes")
        
        if (!filters.categories.some(cat => productCategories.includes(cat))) {
          return false
        }
      }

      // Size filter
      if (filters.sizes.length > 0) {
        const productSizes = product.variants?.map(v => v.size).filter(Boolean) || []
        if (!filters.sizes.some(size => productSizes.includes(size))) {
          return false
        }
      }

      // Color filter
      if (filters.colors.length > 0) {
        const productColors = product.variants?.map(v => v.color).filter(Boolean) || []
        if (!filters.colors.some(color => productColors.includes(color))) {
          return false
        }
      }

      // Stock filter
      if (filters.inStock && !hasStock) {
        return false
      }

      // Sale filter
      if (filters.onSale && !isOnSale) {
        return false
      }

      return true
    })
  }, [products, filters, searchQuery])

  // Sort filtered products
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts]

    switch (sortBy) {
      case "price-low":
        sorted.sort((a, b) => {
          const priceA = a.variants?.[0]?.price || 0
          const priceB = b.variants?.[0]?.price || 0
          return priceA - priceB
        })
        break
      case "price-high":
        sorted.sort((a, b) => {
          const priceA = a.variants?.[0]?.price || 0
          const priceB = b.variants?.[0]?.price || 0
          return priceB - priceA
        })
        break
      case "newest":
        // Sort by ID as a proxy for newness (higher ID = newer)
        sorted.sort((a, b) => b.id - a.id)
        break
      case "name-asc":
        sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        break
      case "name-desc":
        sorted.sort((a, b) => (b.title || "").localeCompare(a.title || ""))
        break
      case "best-selling":
      default:
        // Keep original order for best-selling (assuming API returns in that order)
        break
    }

    return sorted
  }, [filteredProducts, sortBy])

  // Update individual filter
  const updateFilter = useCallback(<K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      priceRange: availableOptions.priceRange,
      categories: [],
      sizes: [],
      colors: [],
      inStock: false,
      onSale: false,
    })
    setSearchQuery("")
  }, [availableOptions.priceRange])

  // Toggle array filter (for categories, sizes, colors)
  const toggleArrayFilter = useCallback(<K extends keyof FilterOptions>(
    key: K,
    value: string
  ) => {
    setFilters(prev => {
      const currentValues = prev[key] as string[]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      return { ...prev, [key]: newValues }
    })
  }, [])

  return {
    // State
    filters,
    sortBy,
    searchQuery,
    
    // Derived data
    filteredProducts: sortedProducts,
    totalProducts: products.length,
    filteredCount: sortedProducts.length,
    availableOptions,
    
    // Actions
    setFilters,
    updateFilter,
    clearFilters,
    toggleArrayFilter,
    setSortBy,
    setSearchQuery,
  }
}
