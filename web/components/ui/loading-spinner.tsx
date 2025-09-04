/**
 * Reusable loading spinner component with different sizes and variants
 */

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'white' | 'gray'
  className?: string
  label?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

const variantClasses = {
  primary: 'text-maroon-600',
  secondary: 'text-gray-600',
  white: 'text-white',
  gray: 'text-gray-400'
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary', 
  className = '',
  label = 'Loading...'
}: LoadingSpinnerProps) {
  return (
    <div className={`inline-flex items-center ${className}`} role="status" aria-label={label}>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
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
      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * Loading button component that shows spinner when loading
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const buttonVariantClasses = {
  primary: 'bg-maroon-600 hover:bg-maroon-700 text-white border-transparent',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-transparent',
  outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border-gray-300'
}

const buttonSizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
}

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center
        border rounded-md font-medium
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${buttonVariantClasses[variant]}
        ${buttonSizeClasses[size]}
        ${className}
      `}
    >
      {loading && (
        <LoadingSpinner
          size={size === 'lg' ? 'md' : 'sm'}
          variant={variant === 'outline' ? 'gray' : 'white'}
          className="mr-2"
        />
      )}
      {loading ? (loadingText || 'Loading...') : children}
    </button>
  )
}

/**
 * Full page loading overlay
 */
interface LoadingOverlayProps {
  show: boolean
  message?: string
  backdrop?: boolean
}

export function LoadingOverlay({ 
  show, 
  message = 'Loading...', 
  backdrop = true 
}: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        backdrop ? 'bg-black bg-opacity-50' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={message}
    >
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-700 text-center">{message}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loader for content placeholders
 */
interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
}

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  rounded = false 
}: SkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`
        animate-pulse bg-gray-200
        ${rounded ? 'rounded-full' : 'rounded'}
        ${className}
      `}
      style={style}
      role="presentation"
      aria-hidden="true"
    />
  )
}

/**
 * Loading state for lists/grids
 */
interface LoadingListProps {
  count?: number
  itemHeight?: number
  showAvatar?: boolean
}

export function LoadingList({ 
  count = 3, 
  itemHeight = 60, 
  showAvatar = false 
}: LoadingListProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4">
          {showAvatar && (
            <Skeleton width={40} height={40} rounded />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="75%" />
            <Skeleton height={14} width="50%" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Loading state for cards
 */
interface LoadingCardProps {
  count?: number
  showImage?: boolean
}

export function LoadingCard({ count = 1, showImage = true }: LoadingCardProps) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-4">
          {showImage && <Skeleton height={200} />}
          <div className="space-y-2">
            <Skeleton height={20} width="80%" />
            <Skeleton height={16} width="60%" />
            <Skeleton height={16} width="40%" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Inline loading text with spinner
 */
interface LoadingTextProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingText({ 
  text = 'Loading...', 
  size = 'md',
  className = '' 
}: LoadingTextProps) {
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`flex items-center space-x-2 text-gray-600 ${textSizeClasses[size]} ${className}`}>
      <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} variant="gray" />
      <span>{text}</span>
    </div>
  )
}
