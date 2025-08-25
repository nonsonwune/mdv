"use client"

import { Button } from "./index"

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageNumbers: number[]
  onPageChange: (page: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  pageNumbers,
  onPageChange,
  onPreviousPage,
  onNextPage,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav 
      className={`flex items-center justify-center gap-2 ${className}`}
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreviousPage}
        disabled={currentPage === 1}
        className="px-3 py-2"
        aria-label="Go to previous page"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline ml-1">Previous</span>
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNum, index) => {
          // Handle ellipsis
          if (pageNum < 0) {
            return (
              <span 
                key={`ellipsis-${index}`}
                className="px-2 text-gray-400"
              >
                …
              </span>
            )
          }

          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "primary" : "ghost"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[40px] ${
                currentPage === pageNum 
                  ? "bg-maroon-700 text-white hover:bg-maroon-800" 
                  : "hover:bg-gray-100"
              }`}
              aria-label={`Go to page ${pageNum}`}
              aria-current={currentPage === pageNum ? "page" : undefined}
            >
              {pageNum}
            </Button>
          )
        })}
      </div>

      {/* Next Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        className="px-3 py-2"
        aria-label="Go to next page"
      >
        <span className="hidden sm:inline mr-1">Next</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </nav>
  )
}

interface SimplePaginationProps {
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  totalItems: number
  onPreviousPage: () => void
  onNextPage: () => void
  className?: string
}

export function SimplePagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPreviousPage,
  onNextPage,
  className = "",
}: SimplePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div 
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      {/* Results Info */}
      <div className="text-sm" style={{ color: "var(--ink-600)" }}>
        Showing {startIndex + 1}–{endIndex} of {totalItems} results
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          Previous
        </Button>
        
        <span className="px-3 text-sm" style={{ color: "var(--ink-700)" }}>
          Page {currentPage} of {totalPages}
        </span>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

interface LoadMoreButtonProps {
  onClick: () => void
  loading?: boolean
  hasMore: boolean
  className?: string
}

export function LoadMoreButton({
  onClick,
  loading = false,
  hasMore,
  className = "",
}: LoadMoreButtonProps) {
  if (!hasMore) return null

  return (
    <div className={`flex justify-center ${className}`}>
      <Button
        variant="secondary"
        size="lg"
        onClick={onClick}
        disabled={loading}
        className="min-w-[200px]"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          "Load More Products"
        )}
      </Button>
    </div>
  )
}
