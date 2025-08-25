"use client"

import { useState, useMemo, useCallback } from "react"

interface UsePaginationProps<T> {
  items: T[]
  itemsPerPage?: number
  infiniteScroll?: boolean
}

export function usePagination<T>({
  items,
  itemsPerPage = 12,
  infiniteScroll = false,
}: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [loadedPages, setLoadedPages] = useState<number[]>([1])

  const totalPages = Math.ceil(items.length / itemsPerPage)

  // Calculate displayed items based on mode
  const displayedItems = useMemo(() => {
    if (infiniteScroll) {
      // For infinite scroll, show all loaded pages
      const maxItem = Math.max(...loadedPages) * itemsPerPage
      return items.slice(0, maxItem)
    } else {
      // For pagination, show only current page
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      return items.slice(startIndex, endIndex)
    }
  }, [items, currentPage, loadedPages, itemsPerPage, infiniteScroll])

  // Load more items (for infinite scroll)
  const loadMore = useCallback(() => {
    if (infiniteScroll) {
      const nextPage = Math.max(...loadedPages) + 1
      if (nextPage <= totalPages) {
        setLoadedPages(prev => [...prev, nextPage])
      }
    }
  }, [infiniteScroll, loadedPages, totalPages])

  // Go to specific page (for pagination)
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      if (infiniteScroll && !loadedPages.includes(page)) {
        setLoadedPages(prev => [...prev, page])
      }
    }
  }, [totalPages, infiniteScroll, loadedPages])

  // Navigation helpers
  const goToFirstPage = useCallback(() => goToPage(1), [goToPage])
  const goToLastPage = useCallback(() => goToPage(totalPages), [goToPage, totalPages])
  const goToPreviousPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage])
  const goToNextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage])

  // Check if more items are available
  const hasMore = infiniteScroll 
    ? Math.max(...loadedPages) < totalPages
    : currentPage < totalPages

  // Reset pagination when items change significantly
  const reset = useCallback(() => {
    setCurrentPage(1)
    setLoadedPages([1])
  }, [])

  // Generate page numbers for pagination controls
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5 // Maximum number of page buttons to show
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show current page and surrounding pages
      const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
      const endPage = Math.min(totalPages, startPage + maxVisible - 1)
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
      
      // Add ellipsis and first/last page if needed
      if (startPage > 2) {
        pages.unshift(-1) // -1 represents ellipsis
        pages.unshift(1)
      } else if (startPage === 2) {
        pages.unshift(1)
      }
      
      if (endPage < totalPages - 1) {
        pages.push(-2) // -2 represents ellipsis
        pages.push(totalPages)
      } else if (endPage === totalPages - 1) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }, [currentPage, totalPages])

  return {
    // Data
    displayedItems,
    currentPage,
    totalPages,
    totalItems: items.length,
    itemsPerPage,
    hasMore,
    
    // For infinite scroll
    loadedPages,
    loadMore,
    
    // For pagination
    pageNumbers,
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToPreviousPage,
    goToNextPage,
    
    // Utilities
    reset,
    
    // Computed values
    startIndex: infiniteScroll ? 0 : (currentPage - 1) * itemsPerPage,
    endIndex: infiniteScroll 
      ? Math.min(Math.max(...loadedPages) * itemsPerPage, items.length)
      : Math.min(currentPage * itemsPerPage, items.length),
  }
}
