"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"

interface SearchBarProps {
  isMobile?: boolean
  onClose?: () => void
  autoFocus?: boolean
}

export default function SearchBar({ isMobile = false, onClose, autoFocus = false }: SearchBarProps) {
  const [q, setQ] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure proper focus on mobile
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [autoFocus])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (!query) return

    setIsLoading(true)
    router.push(`/search?query=${encodeURIComponent(query)}`)

    // Close mobile search if provided
    if (onClose) {
      onClose()
    }

    // Reset loading state after navigation
    setTimeout(() => setIsLoading(false), 1000)
  }

  if (isMobile) {
    return (
      <form onSubmit={onSubmit} className="w-full">
        <div className="relative">
          <input
            ref={inputRef}
            className="w-full border-2 border-neutral-300 rounded-lg px-4 py-3 pr-12 text-base placeholder-neutral-500 focus:border-maroon-600 focus:ring-2 focus:ring-maroon-600/20 transition-all duration-200"
            placeholder="Search products..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <button
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-neutral-600 hover:text-maroon-600 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
            type="submit"
            disabled={isLoading}
            aria-label="Search"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} className="hidden md:flex items-center gap-2">
      <div className="relative">
        <input
          ref={inputRef}
          className="border-2 border-neutral-300 rounded-lg px-4 py-2 pr-10 text-sm placeholder-neutral-500 focus:border-maroon-600 focus:ring-2 focus:ring-maroon-600/20 transition-all duration-200 w-64"
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          autoComplete="off"
        />
        <button
          className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1.5 text-neutral-600 hover:text-maroon-600 transition-colors duration-200"
          type="submit"
          disabled={isLoading}
          aria-label="Search"
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}

