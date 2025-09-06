"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "../lib/api-client"
import type { ProductListResponse } from "../lib/api-types"
import type { Product } from "../lib/types"
import ProductCard from "./_components/ProductCard"
import ProductSkeleton from "./_components/ProductSkeleton"
import HeroSection from "./_components/HeroSection"
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

      {/* Categories Showcase */}
      <CategoriesShowcase />

      {/* Main Catalog Section */}
      <section id="catalog" className="py-20 bg-gradient-to-br from-white via-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-maroon-100 text-maroon-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Our Complete Collection
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-ink-700 mb-6">
              Premium Fashion Essentials
            </h2>
            <p className="text-xl text-ink-600 max-w-3xl mx-auto mb-8">
              Discover affordable luxury and last-season fashion pieces. Quality style that doesn't break the bank, exclusively curated for Nigeria.
            </p>

            {/* Sort Controls */}
            <div className="inline-flex items-center gap-4 bg-white rounded-2xl p-6 shadow-lg border border-neutral-200">
              <label className="flex items-center gap-3 text-sm font-medium text-ink-700">
                <svg className="w-4 h-4 text-maroon-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Sort by:
                <select
                  className="input text-sm min-w-[180px] border-neutral-300 focus:border-maroon-500 focus:ring-maroon-500"
                  value={sort}
                  onChange={e => setSort(e.target.value as any)}
                >
                  <option value="default">Featured First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </label>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: pageSize }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-16">
                {products.map((p: Product, index) => (
                  <div
                    key={p.id}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-6 bg-white rounded-2xl p-6 shadow-lg border border-neutral-200">
                <button
                  className="btn-secondary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ink-600 font-medium">Page</span>
                  <span className="bg-maroon-700 text-white px-4 py-2 rounded-xl font-semibold min-w-[3rem] text-center">{page}</span>
                </div>
                <button
                  className="btn-secondary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={products.length < pageSize}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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

