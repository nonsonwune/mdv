"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import type { Product, Variant } from "../../lib/types"
import EnhancedQuickViewModal from "./EnhancedQuickViewModal"

export default function ProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const v0: Variant | undefined = product.variants?.[0]

  const hasDiscount = typeof product.compare_at_price === "number" && v0?.price != null && product.compare_at_price > v0.price
  const discountPercentage = hasDiscount ? Math.round((1 - Number(v0.price) / Number(product.compare_at_price)) * 100) : 0

  return (
    <div
      className="group bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden">
          {product.images?.[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt_text || product.title}
              width={product.images[0].width ?? 400}
              height={product.images[0].height ?? 400}
              className="w-full aspect-square object-cover bg-neutral-100 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="aspect-square bg-neutral-100 flex items-center justify-center">
              <div className="text-neutral-400 text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-neutral-200 rounded-full"></div>
                <p className="text-xs">No image</p>
              </div>
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute top-3 left-3 bg-maroon-700 text-white px-2 py-1 rounded-full text-xs font-medium">
              -{discountPercentage}%
            </div>
          )}

          {/* Quick View Overlay */}
          <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <button
              onClick={(e) => {
                e.preventDefault()
                setOpen(true)
              }}
              className="bg-white text-ink-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-50 transition-colors duration-200 shadow-lg"
            >
              Quick View
            </button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-medium text-ink-700 mb-2 line-clamp-2">{product.title}</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-ink-700">₦{(v0?.price ?? 0).toLocaleString()}</span>
            {hasDiscount && (
              <span className="line-through text-neutral-500 text-sm">₦{Number(product.compare_at_price).toLocaleString()}</span>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                (v0?.inventory_quantity ?? 0) > 0 ? 'bg-success' : 'bg-neutral-400'
              }`}></div>
              <span className="text-xs text-ink-600">
                {(v0?.inventory_quantity ?? 0) > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            <Link href={`/product/${product.slug}`} className="text-xs text-maroon-700 hover:text-maroon-800 font-medium">
              View Details →
            </Link>
          </div>
        </div>
      </Link>
      {open ? <EnhancedQuickViewModal slug={product.slug} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}

