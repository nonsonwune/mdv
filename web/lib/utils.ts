import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mobile detection utilities
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Viewport utilities
export function getViewportSize() {
  if (typeof window === 'undefined') return { width: 0, height: 0 }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight
  }
}

export function isMobileViewport(): boolean {
  const { width } = getViewportSize()
  return width < 768 // md breakpoint
}

// Touch target utilities
export function ensureMinTouchTarget(size: number): number {
  return Math.max(size, 44) // 44px minimum for accessibility
}

// Format utilities for mobile display
export function formatCurrency(amount: number | string, currency = '₦'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return `${currency}0`
  
  return `${currency}${num.toLocaleString()}`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// Mobile-specific formatting
export function formatForMobile(text: string, maxLength = 30): string {
  return truncateText(text, maxLength)
}

// Debounce utility for search and form inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Safe area utilities for mobile devices with notches
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 }
  
  const style = getComputedStyle(document.documentElement)
  
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0')
  }
}

// Scroll utilities
export function scrollToTop(smooth = true) {
  if (typeof window === 'undefined') return
  
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

export function scrollToElement(elementId: string, offset = 0) {
  if (typeof window === 'undefined') return
  
  const element = document.getElementById(elementId)
  if (!element) return
  
  const elementPosition = element.offsetTop - offset
  window.scrollTo({
    top: elementPosition,
    behavior: 'smooth'
  })
}

// Focus management for mobile
export function focusElement(elementId: string, delay = 100) {
  if (typeof window === 'undefined') return
  
  setTimeout(() => {
    const element = document.getElementById(elementId) as HTMLElement
    if (element && element.focus) {
      element.focus()
    }
  }, delay)
}

// Prevent body scroll (for modals/overlays)
export function preventBodyScroll(prevent: boolean) {
  if (typeof document === 'undefined') return
  
  if (prevent) {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
  } else {
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
  }
}

// Image optimization for mobile
export function getOptimizedImageUrl(url: string, width?: number, quality = 75): string {
  if (!url) return ''
  
  // If it's already optimized or external, return as-is
  if (url.includes('?') || url.startsWith('http')) return url
  
  const params = new URLSearchParams()
  if (width) params.set('w', width.toString())
  params.set('q', quality.toString())
  
  return `${url}?${params.toString()}`
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}

// Local storage utilities with error handling
export function safeLocalStorage() {
  const isAvailable = typeof window !== 'undefined' && window.localStorage
  
  return {
    getItem: (key: string): string | null => {
      if (!isAvailable) return null
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string): boolean => {
      if (!isAvailable) return false
      try {
        localStorage.setItem(key, value)
        return true
      } catch {
        return false
      }
    },
    removeItem: (key: string): boolean => {
      if (!isAvailable) return false
      try {
        localStorage.removeItem(key)
        return true
      } catch {
        return false
      }
    }
  }
}
