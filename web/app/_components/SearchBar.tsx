"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SearchBar() {
  const [q, setQ] = useState("")
  const router = useRouter()
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    router.push(`/search?query=${encodeURIComponent(query)}`)
  }
  return (
    <form onSubmit={onSubmit} className="hidden md:flex items-center gap-2">
      <input
        className="border rounded px-2 py-1 text-sm"
        placeholder="Search products…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="border rounded px-2 py-1 text-sm" type="submit">Search</button>
    </form>
  )
}

