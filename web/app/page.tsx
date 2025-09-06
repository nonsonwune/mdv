"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "../lib/api-client"
import type { ProductListResponse } from "../lib/api-types"
import type { Product } from "../lib/types"
import ProductCard from "./_components/ProductCard"
import ProductSkeleton from "./_components/ProductSkeleton"
import HeroSection from "./_components/HeroSection"
import FeaturedProducts from "./_components/FeaturedProducts"
import CategoriesShowcase from "./_components/CategoriesShowcase"
import { useSearchParams, useRouter } from "next/navigation"

function priceOf(product: any): number {
  return Number(product?.variants?.[0]?.price || 0)
}

export default function Home() {
  const sp = useSearchParams()
  const router = useRouter()
  const page = Math.max(1, Number(sp.get("page") || 1))
  const pageSize = 12
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<"default" | "price_asc" | "price_desc">("default")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api<ProductListResponse>(`/api/products?page=${page}&page_size=${pageSize}`)
      .then(d => {
        if (cancelled) return
        let items = (d.items as Product[]) || []
        if (sort === "price_asc") items = [...items].sort((a, b) => priceOf(a) - priceOf(b))
        if (sort === "price_desc") items = [...items].sort((a, b) => priceOf(b) - priceOf(a))
        setProducts(items)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
        // simple retry after short delay (API might not be up yet in CI)
        const t = setTimeout(() => setAttempt(a => a + 1), 1000)
        return () => clearTimeout(t)
      })
    return () => { cancelled = true }
  }, [page, sort, attempt])

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(Array.from(sp.entries()))
    params.set("page", String(nextPage))
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Products */}
      <FeaturedProducts products={products} loading={loading} />

      {/* Categories Showcase */}
      <CategoriesShowcase />

      {/* Main Catalog Section */}
      <section id="catalog" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-ink-700 mb-4">
              Complete Catalog
            </h2>
            <p className="text-lg text-ink-600 max-w-2xl mx-auto mb-8">
              Browse our entire collection of premium fashion essentials
            </p>

            {/* Sort Controls */}
            <div className="inline-flex items-center gap-4 bg-neutral-50 rounded-xl p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                Sort by:
                <select
                  className="input text-sm min-w-[160px]"
                  value={sort}
                  onChange={e => setSort(e.target.value as any)}
                >
                  <option value="default">Default</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </label>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: pageSize }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
                {products.map((p: Product) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-4">
                <button
                  className="btn-secondary px-6 py-3"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-600">Page</span>
                  <span className="bg-maroon-700 text-white px-3 py-1 rounded-lg font-medium">{page}</span>
                </div>
                <button
                  className="btn-secondary px-6 py-3"
                  disabled={products.length < pageSize}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-neutral-100 rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
              </div>
              <h3 className="text-xl font-semibold text-ink-700 mb-2">No Products Found</h3>
              <p className="text-ink-600 mb-6">We're working on adding more products to our catalog.</p>
              <Link href="/contact" className="btn-primary">
                Contact Us
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

