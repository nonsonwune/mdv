"use client"

import { forwardRef } from "react"

interface LoadMoreTriggerProps {
  loading?: boolean
  hasMore?: boolean
}

export const LoadMoreTrigger = forwardRef<HTMLDivElement, LoadMoreTriggerProps>(
  ({ loading = false, hasMore = true }, ref) => {
    return (
      <div 
        ref={ref}
        className="h-10 flex items-center justify-center"
        aria-hidden="true"
      >
        {loading && hasMore && (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
            <span className="text-sm" style={{ color: "var(--ink-600)" }}>
              Loading more products...
            </span>
          </div>
        )}
      </div>
    )
  }
)

LoadMoreTrigger.displayName = "LoadMoreTrigger"
