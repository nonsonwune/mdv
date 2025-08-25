"use client"

import { useEffect, useState } from "react"

export default function HeaderCartCount() {
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    // Simple polling approach; can be upgraded to context or SWR later
    let cancelled = false
    async function load() {
      try {
        const raw = localStorage.getItem("mdv_cart_id")
        if (!raw) {
          if (!cancelled) setCount(0)
          return
        }
        const cartId = Number(raw)
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const res = await fetch(`${base}/api/cart/${cartId}`, { cache: "no-store" })
        if (res.status === 404) {
          localStorage.removeItem("mdv_cart_id")
          if (!cancelled) setCount(0)
          return
        }
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setCount(Array.isArray(data.items) ? data.items.reduce((n: number, it: any) => n + (it.qty || 0), 0) : 0)
      } catch {
        // noop
      }
    }
    load()
    const iv = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  if (!count) return null
  return <span className="inline-flex items-center justify-center text-[10px] min-w-[16px] h-[16px] rounded-full bg-[var(--maroon-700)] text-white">{count}</span>
}

