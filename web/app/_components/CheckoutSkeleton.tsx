"use client"

import { useEffect, useState } from "react"

export default function CheckoutSkeleton() {
  const [lines] = useState(() => Array.from({ length: 6 }))
  return (
    <div className="mt-4 animate-pulse">
      <div className="border border-neutral-200 rounded p-4">
        <div className="h-4 bg-neutral-100 rounded w-1/3" />
        <div className="mt-3 space-y-2">
          {lines.map((_, i) => (
            <div key={i} className={`h-3 bg-neutral-100 rounded ${i % 3 === 0 ? 'w-5/6' : i % 3 === 1 ? 'w-2/3' : 'w-1/2'}`} />
          ))}
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-10 bg-neutral-100 rounded" />
          <div className="h-10 bg-neutral-100 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-10 bg-neutral-100 rounded" />
          <div className="h-10 bg-neutral-100 rounded" />
        </div>
        <div className="h-10 bg-neutral-100 rounded" />
        <div className="h-10 bg-neutral-100 rounded" />
        <div className="h-10 bg-neutral-100 rounded" />
        <div className="h-10 bg-neutral-100 rounded w-40" />
      </div>
    </div>
  )
}

