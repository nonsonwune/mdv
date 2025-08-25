"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import type { Product } from "../../lib/types"
import FilterSidebar from "../filters/FilterSidebar"
import ProductCard from "../products/ProductCard"
import RecentlyViewed from "../products/RecentlyViewed"
import { Button, Drawer, EmptyState, Skeleton } from "../ui"

interface CategoryLayoutProps {
  title: string
  description?: string
  products: Product[]
  category?: string
}

function ProductGrid({ products, loading }: { products: Product[], loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i}>
            <Skeleton variant="rectangular" height={300} />
            <Skeleton variant="text" className="mt-2" />
            <Skeleton variant="text" width="60%" className="mt-1" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        title="No products found"
        description="Try adjusting your filters or search criteria"
        action={
          <Button variant="secondary" onClick={() => window.location.href = window.location.pathname}>
            Clear Filters
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product, idx) => (
        <ProductCard key={product.id} product={product} priority={idx < 8} />
      ))}
    </div>
  )
}

export default function CategoryLayout({ title, description, products: initialProducts, category }: CategoryLayoutProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [loading, setLoading] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Sorting
  const sortBy = searchParams.get("sort") || "relevance"
  const [sortOpen, setSortOpen] = useState(false)
  
  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "newest", label: "Newest First" },
    { value: "rating", label: "Highest Rated" },
    { value: "bestselling", label: "Best Selling" },
  ]

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...initialProducts]
    
    // Price filter
    const minPrice = Number(searchParams.get("minPrice")) || 0
    const maxPrice = Number(searchParams.get("maxPrice")) || Infinity
    if (minPrice > 0 || maxPrice < Infinity) {
      filtered = filtered.filter(p => {
        const price = p.variants?.[0]?.price || 0
        return price >= minPrice && price <= maxPrice
      })
    }
    
    // Size filter
    const sizes = searchParams.get("sizes")?.split(",").filter(Boolean) || []
    if (sizes.length > 0) {
      filtered = filtered.filter(p => 
        p.variants?.some(v => sizes.includes(v.size || ""))
      )
    }
    
    // Color filter
    const colors = searchParams.get("colors")?.split(",").filter(Boolean) || []
    if (colors.length > 0) {
      filtered = filtered.filter(p =>
        p.variants?.some(v => colors.includes((v.color || "").toLowerCase()))
      )
    }
    
    // On sale filter
    if (searchParams.get("onSale") === "true") {
      filtered = filtered.filter(p => {
        const price = p.variants?.[0]?.price || 0
        return p.compare_at_price && p.compare_at_price > price
      })
    }
    
    // Sort products
    switch (sortBy) {
      case "price_asc":
        filtered.sort((a, b) => (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0))
        break
      case "price_desc":
        filtered.sort((a, b) => (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0))
        break
      case "newest":
        filtered.sort((a, b) => b.id - a.id) // Mock: higher ID = newer
        break
      case "rating":
        // Mock rating sort
        filtered.sort(() => Math.random() - 0.5)
        break
      case "bestselling":
        // Mock bestselling sort
        filtered.sort(() => Math.random() - 0.5)
        break
    }
    
    setProducts(filtered)
  }, [searchParams, initialProducts, sortBy])

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", value)
    router.push(`?${params.toString()}`)
    setSortOpen(false)
  }

  // Count active filters
  const activeFilterCount = [
    searchParams.get("minPrice"),
    searchParams.get("maxPrice"),
    searchParams.get("sizes"),
    searchParams.get("colors"),
    searchParams.get("categories"),
    searchParams.get("inStock"),
    searchParams.get("onSale"),
  ].filter(Boolean).length

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-600 mb-6">
        <Link href="/" className="hover:text-maroon-700">Home</Link>
        <span>/</span>
        <span className="text-neutral-900">{title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        {description && (
          <p className="text-neutral-600">{description}</p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-4">
          {/* Mobile Filter Button */}
          <Button
            variant="secondary"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-maroon-700 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Product Count */}
          <p className="text-sm text-neutral-600">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 text-sm border border-neutral-300 rounded-lg px-3 py-2 hover:bg-neutral-50"
            >
              <span>Sort by: {sortOptions.find(o => o.value === sortBy)?.label}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {sortOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-20">
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleSort(option.value)}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                      sortBy === option.value ? "bg-maroon-50 text-maroon-700" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="hidden md:flex items-center gap-1 border border-neutral-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded ${viewMode === "grid" ? "bg-neutral-200" : "hover:bg-neutral-100"}`}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded ${viewMode === "list" ? "bg-neutral-200" : "hover:bg-neutral-100"}`}
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <FilterSidebar />
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <Suspense fallback={<ProductGrid products={[]} loading={true} />}>
            <ProductGrid products={products} loading={loading} />
          </Suspense>

          {/* Pagination */}
          {products.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50">
                Previous
              </button>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(page => (
                  <button
                    key={page}
                    className={`w-10 h-10 rounded-lg ${
                      page === 1 ? "bg-maroon-700 text-white" : "hover:bg-neutral-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50">
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Mobile Filters Drawer */}
      <Drawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filters"
        position="left"
      >
        <div className="p-4">
          <FilterSidebar isMobile onClose={() => setMobileFiltersOpen(false)} />
        </div>
      </Drawer>
    </div>
  )
}
