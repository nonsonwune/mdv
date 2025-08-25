"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { API_BASE } from "../../lib/api"
import type { Product } from "../../lib/types"
import Image from "next/image"

export default function QuickViewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/${slug}`, { cache: "no-store" })
        if (res.ok) setProduct(await res.json())
      } finally { setLoading(false) }
    })()
  }, [slug])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded shadow-xl w-[min(700px,92vw)]">
        <div className="flex items-center justify-between border-b p-3">
          <div className="font-medium">Quick view</div>
          <button onClick={onClose} className="text-sm underline">Close</button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="animate-pulse">
              <div className="w-full aspect-square bg-neutral-100 rounded" />
              <div className="h-4 bg-neutral-100 mt-4 w-2/3 rounded" />
              <div className="h-4 bg-neutral-100 mt-2 w-1/3 rounded" />
            </div>
          ) : !product ? (
            <p className="text-sm">Failed to load product.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                {product.images?.[0]?.url ? (
                  <Image src={product.images[0].url} alt={product.images[0].alt_text || product.title} width={product.images[0].width ?? 1000} height={product.images[0].height ?? 1000} className="w-full aspect-square object-cover rounded bg-neutral-100" />
                ) : (
                  <div className="aspect-square bg-neutral-100" />
                )}
              </div>
              <div>
                <div className="text-lg font-medium">{product.title}</div>
                {product.variants?.[0] ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span>₦{Number(product.variants[0].price || 0).toLocaleString()}</span>
                    {typeof product.compare_at_price === "number" && Number(product.compare_at_price) > Number(product.variants[0].price || 0) ? (
                      <>
                        <span className="line-through text-neutral-500 text-xs">₦{Number(product.compare_at_price).toLocaleString()}</span>
                        <span className="text-[10px] bg-[var(--maroon-700)] text-white rounded px-1.5 py-0.5">
                          -{Math.round((1 - Number(product.variants[0].price) / Number(product.compare_at_price)) * 100)}%
                        </span>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/product/${product.slug}`} className="btn-primary">View details</Link>
                  <Link href={`/cart?add=${product.variants?.[0]?.id ?? ""}`} className="border rounded px-3 py-2 text-sm">Add first variant</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

