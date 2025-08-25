"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "../lib/api-client"
import type { ProductListResponse } from "../lib/api-types"
import type { Product } from "../lib/types"
import ProductCard from "./_components/ProductCard"
import ProductSkeleton from "./_components/ProductSkeleton"
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold" style={{color: "var(--ink-700)"}}>Maison De Valeur</h1>
          <p className="text-sm mt-2" style={{color: "var(--ink-600)"}}>Affordable essentials and last‑season items. Nigeria‑only checkout.</p>
        </div>
        <Link href="/cart" className="btn-primary">Cart</Link>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{color: "var(--ink-700)"}}>Catalog</h2>
          <div className="flex items-center gap-2 text-sm">
            <label>
              Sort:
              <select className="border rounded px-2 py-1 ml-2" value={sort} onChange={e => setSort(e.target.value as any)}>
                <option value="default">Default</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </label>
          </div>
        </div>
        {loading ? (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: pageSize }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((p: Product) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="flex items-center justify-between mt-6">
              <button className="border rounded px-3 py-2" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Previous</button>
              <div className="text-sm">Page {page}</div>
              <button className="border rounded px-3 py-2" disabled={products.length < pageSize} onClick={() => goToPage(page + 1)}>Next</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

