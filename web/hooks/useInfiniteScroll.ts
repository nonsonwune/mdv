"use client"

import { useEffect, useRef, useCallback } from "react"

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  hasMore: boolean
  loading?: boolean
  threshold?: number
  rootMargin?: string
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  loading = false,
  threshold = 0.1,
  rootMargin = "100px",
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasMore && !loading) {
        onLoadMore()
      }
    },
    [hasMore, loading, onLoadMore]
  )

  useEffect(() => {
    const element = loadMoreRef.current
    
    if (!element) return

    // Create observer
    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold,
      rootMargin,
    })

    // Start observing
    observerRef.current.observe(element)

    // Cleanup
    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element)
      }
    }
  }, [handleObserver, threshold, rootMargin])

  return {
    loadMoreRef,
    loading,
    hasMore,
  }
}
