"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import type { Product, Variant } from "../../lib/types"
import QuickViewModal from "./QuickViewModal"

export default function ProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const v0: Variant | undefined = product.variants?.[0]
  return (
    <div className="border border-neutral-200 rounded p-4 hover:bg-neutral-50">
      <Link href={`/product/${product.slug}`}>
        {product.images?.[0]?.url ? (
          <Image src={product.images[0].url} alt={product.images[0].alt_text || product.title} width={product.images[0].width ?? 800} height={product.images[0].height ?? 800} className="w-full aspect-square object-cover mb-2 rounded bg-neutral-100" />
        ) : (
          <div className="aspect-square bg-neutral-100 mb-2" />
        )}
        <div className="text-sm font-medium">{product.title}</div>
        <div className="text-sm flex items-center gap-2">
          <span>₦{(v0?.price ?? 0).toLocaleString()}</span>
          {typeof product.compare_at_price === "number" && v0?.price != null && product.compare_at_price > v0.price ? (
            <>
              <span className="line-through text-neutral-500 text-xs">₦{Number(product.compare_at_price).toLocaleString()}</span>
              <span className="text-[10px] bg-[var(--maroon-700)] text-white rounded px-1.5 py-0.5">
                -{Math.round((1 - Number(v0.price) / Number(product.compare_at_price)) * 100)}%
              </span>
            </>
          ) : null}
        </div>
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <button className="border rounded px-3 py-1 text-sm" onClick={() => setOpen(true)}>Quick view</button>
        <Link href={`/product/${product.slug}`} className="underline text-sm">Details</Link>
      </div>
      {open ? <QuickViewModal slug={product.slug} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}

