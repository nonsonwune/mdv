/**
 * Client-side storage utilities for features not yet implemented in backend
 */

import type { Product } from './types'

const RECENTLY_VIEWED_KEY = 'mdv_recently_viewed'
const WISHLIST_KEY = 'mdv_wishlist'
const MAX_RECENTLY_VIEWED = 10

export interface RecentlyViewedItem {
  productId: string
  viewedAt: string
  product?: Product // Optional to store product data for offline access
}

export interface WishlistItem {
  productId: string
  addedAt: string
  product?: Product // Optional to store product data for offline access
}

// Recently Viewed Products
export const recentlyViewed = {
  add(productId: string, product?: Product) {
    if (typeof window === 'undefined') return
    
    const items = this.getAll()
    
    // Remove if already exists (to re-add at the beginning)
    const filtered = items.filter(item => item.productId !== productId)
    
    // Add to beginning
    const newItem: RecentlyViewedItem = {
      productId,
      viewedAt: new Date().toISOString(),
      product
    }
    
    const updated = [newItem, ...filtered].slice(0, MAX_RECENTLY_VIEWED)
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
  },
  
  getAll(): RecentlyViewedItem[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },
  
  clear() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(RECENTLY_VIEWED_KEY)
  },

  // Clean up old entries (older than 30 days) and invalid data
  cleanup() {
    if (typeof window === 'undefined') return

    try {
      const items = this.getAll()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Filter out old entries and validate data structure
      const validItems = items.filter(item => {
        // Check if item is valid and not too old
        const isValid = item &&
          item.productId &&
          item.viewedAt &&
          item.product &&
          item.product.id &&
          item.product.title &&
          item.product.slug

        if (!isValid) return false

        // Check if not too old
        const viewedDate = new Date(item.viewedAt)
        return viewedDate > thirtyDaysAgo
      })

      // Update localStorage if we cleaned anything
      if (validItems.length !== items.length) {
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(validItems))
      }
    } catch (error) {
      console.error('Error cleaning up recently viewed:', error)
      // If cleanup fails, clear all data to prevent corruption
      this.clear()
    }
  }
}

// Wishlist
export const wishlist = {
  add(productId: string, product?: Product): boolean {
    if (typeof window === 'undefined') return false
    
    const items = this.getAll()
    
    // Check if already exists
    if (items.some(item => item.productId === productId)) {
      return false // Already in wishlist
    }
    
    const newItem: WishlistItem = {
      productId,
      addedAt: new Date().toISOString(),
      product
    }
    
    const updated = [...items, newItem]
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated))
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('wishlist-updated', { 
      detail: { action: 'add', productId } 
    }))
    
    return true
  },
  
  remove(productId: string): boolean {
    if (typeof window === 'undefined') return false
    
    const items = this.getAll()
    const filtered = items.filter(item => item.productId !== productId)
    
    if (filtered.length === items.length) {
      return false // Item wasn't in wishlist
    }
    
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(filtered))
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('wishlist-updated', { 
      detail: { action: 'remove', productId } 
    }))
    
    return true
  },
  
  toggle(productId: string, product?: Product): boolean {
    if (this.has(productId)) {
      this.remove(productId)
      return false
    } else {
      this.add(productId, product)
      return true
    }
  },
  
  has(productId: string): boolean {
    if (typeof window === 'undefined') return false
    return this.getAll().some(item => item.productId === productId)
  },
  
  getAll(): WishlistItem[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },
  
  getCount(): number {
    return this.getAll().length
  },
  
  clear() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(WISHLIST_KEY)
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('wishlist-updated', { 
      detail: { action: 'clear' } 
    }))
  }
}

// Saved for Later (from cart)
const SAVED_FOR_LATER_KEY = 'mdv_saved_for_later'

export interface SavedForLaterItem {
  variantId: string
  productId: string
  quantity: number
  savedAt: string
  product?: Product
  variant?: any
}

export const savedForLater = {
  add(item: Omit<SavedForLaterItem, 'savedAt'>): boolean {
    if (typeof window === 'undefined') return false
    
    const items = this.getAll()
    
    // Check if already exists
    if (items.some(i => i.variantId === item.variantId)) {
      return false
    }
    
    const newItem: SavedForLaterItem = {
      ...item,
      savedAt: new Date().toISOString()
    }
    
    const updated = [...items, newItem]
    localStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(updated))
    
    return true
  },
  
  remove(variantId: string): boolean {
    if (typeof window === 'undefined') return false
    
    const items = this.getAll()
    const filtered = items.filter(item => item.variantId !== variantId)
    
    if (filtered.length === items.length) {
      return false
    }
    
    localStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(filtered))
    return true
  },
  
  getAll(): SavedForLaterItem[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(SAVED_FOR_LATER_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },
  
  clear() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(SAVED_FOR_LATER_KEY)
  }
}

// Compare Products
const COMPARE_KEY = 'mdv_compare_products'
const MAX_COMPARE = 4

export const compareProducts = {
  add(productId: string, product?: Product): boolean {
    if (typeof window === 'undefined') return false
    
    const items = this.getAll()
    
    if (items.length >= MAX_COMPARE) {
      return false // Max reached
    }
    
    if (items.some(item => item.productId === productId)) {
      return false // Already in compare
    }
    
    const updated = [...items, { productId, product }]
    localStorage.setItem(COMPARE_KEY, JSON.stringify(updated))
    
    window.dispatchEvent(new CustomEvent('compare-updated'))
    return true
  },
  
  remove(productId: string): boolean {
    if (typeof window === 'undefined') return false
    
    const items = this.getAll()
    const filtered = items.filter(item => item.productId !== productId)
    
    if (filtered.length === items.length) {
      return false
    }
    
    localStorage.setItem(COMPARE_KEY, JSON.stringify(filtered))
    window.dispatchEvent(new CustomEvent('compare-updated'))
    return true
  },
  
  getAll(): Array<{ productId: string; product?: Product }> {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(COMPARE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },
  
  clear() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(COMPARE_KEY)
    window.dispatchEvent(new CustomEvent('compare-updated'))
  }
}
