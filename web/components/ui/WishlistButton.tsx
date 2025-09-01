"use client"

import { useState, useEffect } from 'react'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useWishlist } from '../../hooks/useWishlist'
import { useAuth } from '../../lib/auth-context'

interface WishlistButtonProps {
  productId: number
  variantId?: number
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function WishlistButton({ 
  productId, 
  variantId, 
  size = 'md', 
  showText = false,
  className = '' 
}: WishlistButtonProps) {
  const { isAuthenticated } = useAuth()
  const { 
    isInWishlist, 
    toggleItem, 
    checkWishlistStatus, 
    isLoading: wishlistLoading 
  } = useWishlist()
  
  const [isInList, setIsInList] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Check wishlist status on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      const checkStatus = async () => {
        try {
          const status = await checkWishlistStatus(productId, variantId)
          setIsInList(status)
        } catch (error) {
          console.error('Failed to check wishlist status:', error)
        }
      }
      checkStatus()
    } else {
      setIsInList(false)
    }
  }, [isAuthenticated, productId, variantId, checkWishlistStatus])

  // Also check local state for immediate feedback
  useEffect(() => {
    if (isAuthenticated) {
      setIsInList(isInWishlist(productId, variantId))
    }
  }, [isAuthenticated, productId, variantId, isInWishlist])

  const handleToggle = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      setTimeout(() => setShowLoginPrompt(false), 3000)
      return
    }

    setIsToggling(true)
    try {
      const wasAdded = await toggleItem(productId, variantId)
      setIsInList(wasAdded)
    } catch (error) {
      console.error('Failed to toggle wishlist item:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const isDisabled = isToggling || wishlistLoading

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={isDisabled}
        className={`
          relative inline-flex items-center justify-center
          ${buttonSizeClasses[size]}
          ${isInList 
            ? 'text-red-600 hover:text-red-700' 
            : 'text-gray-400 hover:text-red-500'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
          transition-all duration-200 ease-in-out
          ${className}
        `}
        title={isInList ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {isToggling ? (
          <div className={`${sizeClasses[size]} animate-spin`}>
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
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
          </div>
        ) : isInList ? (
          <HeartSolidIcon className={`${sizeClasses[size]} drop-shadow-sm`} />
        ) : (
          <HeartIcon className={`${sizeClasses[size]}`} />
        )}
        
        {showText && (
          <span className={`ml-2 ${textSizeClasses[size]} font-medium`}>
            {isInList ? 'In Wishlist' : 'Add to Wishlist'}
          </span>
        )}
      </button>

      {/* Login prompt tooltip */}
      {showLoginPrompt && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            Please log in to add items to your wishlist
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for product grids
export function WishlistButtonCompact({ productId, variantId, className = '' }: {
  productId: number
  variantId?: number
  className?: string
}) {
  return (
    <WishlistButton
      productId={productId}
      variantId={variantId}
      size="sm"
      className={`absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white/90 ${className}`}
    />
  )
}

// Full button with text for product detail pages
export function WishlistButtonFull({ productId, variantId, className = '' }: {
  productId: number
  variantId?: number
  className?: string
}) {
  return (
    <WishlistButton
      productId={productId}
      variantId={variantId}
      size="md"
      showText={true}
      className={`border border-gray-300 rounded-lg px-4 py-2 hover:border-red-300 hover:bg-red-50 ${className}`}
    />
  )
}
