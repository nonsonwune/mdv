/**
 * Client-side storage utilities for features not yet implemented in backend
 *
 * Features:
 * - Version-based cleanup system for automatic data migration
 * - Age-based filtering for data retention policies
 * - Robust error handling and data validation
 * - Automatic cleanup when validation logic changes
 */

import type { Product } from './types'

// Storage keys
const RECENTLY_VIEWED_KEY = 'mdv_recently_viewed'
const WISHLIST_KEY = 'mdv_wishlist'
const SAVED_FOR_LATER_KEY = 'mdv_saved_for_later'
const COMPARE_KEY = 'mdv_compare_products'

// Version keys for cleanup system
const RECENTLY_VIEWED_VERSION_KEY = 'mdv_recently_viewed_version'
const WISHLIST_VERSION_KEY = 'mdv_wishlist_version'
const SAVED_FOR_LATER_VERSION_KEY = 'mdv_saved_for_later_version'
const COMPARE_VERSION_KEY = 'mdv_compare_version'

// Current versions - increment when validation logic changes
const RECENTLY_VIEWED_VERSION = 'v3.0'
const WISHLIST_VERSION = 'v2.0'
const SAVED_FOR_LATER_VERSION = 'v2.0'
const COMPARE_VERSION = 'v2.0'

// Configuration
const MAX_RECENTLY_VIEWED = 10
const MAX_WISHLIST = 50
const MAX_SAVED_FOR_LATER = 20
const MAX_COMPARE = 4
const DATA_RETENTION_DAYS = 30

/**
 * Version-based cleanup system
 *
 * This system automatically cleans up and migrates data when validation logic changes.
 * Each storage type has a version number that gets incremented when the validation
 * or data structure changes, triggering automatic cleanup.
 */

interface VersionedCleanupConfig {
  storageKey: string
  versionKey: string
  currentVersion: string
  maxItems: number
  retentionDays: number
  validator: (item: any) => boolean
  migrator?: (oldData: any[]) => any[]
}

/**
 * Checks if cleanup is needed based on version changes
 */
function needsVersionCleanup(versionKey: string, currentVersion: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const storedVersion = localStorage.getItem(versionKey)
    return storedVersion !== currentVersion
  } catch {
    return true
  }
}

/**
 * Performs version-based cleanup for any storage type
 */
function performVersionCleanup(config: VersionedCleanupConfig): any[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(config.storageKey)
    if (!stored) {
      // No data, just update version
      localStorage.setItem(config.versionKey, config.currentVersion)
      return []
    }

    let data = JSON.parse(stored)
    if (!Array.isArray(data)) {
      console.warn(`Invalid data format in ${config.storageKey}, clearing...`)
      localStorage.removeItem(config.storageKey)
      localStorage.setItem(config.versionKey, config.currentVersion)
      return []
    }

    // Apply migrator if provided
    if (config.migrator) {
      data = config.migrator(data)
    }

    // Filter by age
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays)

    const validItems = data.filter((item: any) => {
      // Validate item structure
      if (!config.validator(item)) return false

      // Check age if item has a timestamp
      const timestamp = item.viewedAt || item.addedAt || item.savedAt
      if (timestamp) {
        const itemDate = new Date(timestamp)
        if (itemDate < cutoffDate) return false
      }

      return true
    }).slice(0, config.maxItems)

    // Update storage
    localStorage.setItem(config.storageKey, JSON.stringify(validItems))
    localStorage.setItem(config.versionKey, config.currentVersion)

    console.log(`Cleaned up ${config.storageKey}: ${data.length} -> ${validItems.length} items`)
    return validItems

  } catch (error) {
    console.error(`Error during version cleanup for ${config.storageKey}:`, error)
    // Clear corrupted data
    localStorage.removeItem(config.storageKey)
    localStorage.setItem(config.versionKey, config.currentVersion)
    return []
  }
}

/**
 * Generic storage utility with version-based cleanup
 */
function createVersionedStorage<T>(config: VersionedCleanupConfig) {
  return {
    getAll(): T[] {
      if (typeof window === 'undefined') return []

      // Check if cleanup is needed
      if (needsVersionCleanup(config.versionKey, config.currentVersion)) {
        return performVersionCleanup(config) as T[]
      }

      try {
        const stored = localStorage.getItem(config.storageKey)
        return stored ? JSON.parse(stored) : []
      } catch {
        return []
      }
    },

    save(items: T[]): void {
      if (typeof window === 'undefined') return

      try {
        const validItems = items
          .filter(config.validator)
          .slice(0, config.maxItems)

        localStorage.setItem(config.storageKey, JSON.stringify(validItems))
      } catch (error) {
        console.error(`Error saving to ${config.storageKey}:`, error)
      }
    },

    clear(): void {
      if (typeof window === 'undefined') return
      localStorage.removeItem(config.storageKey)
    },

    forceCleanup(): T[] {
      return performVersionCleanup(config) as T[]
    }
  }
}

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

// Validators for different data types
const validateRecentlyViewedItem = (item: any): item is RecentlyViewedItem => {
  return (
    item &&
    typeof item.productId === 'string' &&
    typeof item.viewedAt === 'string' &&
    item.product &&
    typeof item.product.id === 'number' &&
    typeof item.product.title === 'string' &&
    typeof item.product.slug === 'string' &&
    Array.isArray(item.product.variants) &&
    item.product.variants.length > 0 &&
    Array.isArray(item.product.images)
  )
}

// Migrator for recently viewed (converts old format to new)
const migrateRecentlyViewed = (oldData: any[]): RecentlyViewedItem[] => {
  if (!Array.isArray(oldData) || oldData.length === 0) return []

  // Check if it's already in new format
  if (oldData[0] && oldData[0].productId && oldData[0].viewedAt) {
    return oldData.filter(validateRecentlyViewedItem)
  }

  // Convert old format (direct Product array) to new format
  return oldData
    .filter((product: any) =>
      product &&
      typeof product.id === 'number' &&
      typeof product.title === 'string' &&
      typeof product.slug === 'string'
    )
    .map((product: Product) => ({
      productId: String(product.id),
      viewedAt: new Date().toISOString(),
      product
    }))
}

// Create versioned storage for recently viewed
const recentlyViewedStorage = createVersionedStorage<RecentlyViewedItem>({
  storageKey: RECENTLY_VIEWED_KEY,
  versionKey: RECENTLY_VIEWED_VERSION_KEY,
  currentVersion: RECENTLY_VIEWED_VERSION,
  maxItems: MAX_RECENTLY_VIEWED,
  retentionDays: DATA_RETENTION_DAYS,
  validator: validateRecentlyViewedItem,
  migrator: migrateRecentlyViewed
})

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

    const updated = [newItem, ...filtered]
    recentlyViewedStorage.save(updated)
  },

  getAll(): RecentlyViewedItem[] {
    return recentlyViewedStorage.getAll()
  },

  clear() {
    recentlyViewedStorage.clear()
  },

  // Force cleanup (useful for testing or manual cleanup)
  cleanup(): RecentlyViewedItem[] {
    return recentlyViewedStorage.forceCleanup()
  },

  // Check if cleanup is needed
  needsCleanup(): boolean {
    return needsVersionCleanup(RECENTLY_VIEWED_VERSION_KEY, RECENTLY_VIEWED_VERSION)
  }
}

// Validator for wishlist items
const validateWishlistItem = (item: any): item is WishlistItem => {
  return (
    item &&
    typeof item.productId === 'string' &&
    typeof item.addedAt === 'string' &&
    (!item.product || (
      typeof item.product.id === 'number' &&
      typeof item.product.title === 'string' &&
      typeof item.product.slug === 'string'
    ))
  )
}

// Create versioned storage for wishlist
const wishlistStorage = createVersionedStorage<WishlistItem>({
  storageKey: WISHLIST_KEY,
  versionKey: WISHLIST_VERSION_KEY,
  currentVersion: WISHLIST_VERSION,
  maxItems: MAX_WISHLIST,
  retentionDays: DATA_RETENTION_DAYS * 3, // Keep wishlist items longer (90 days)
  validator: validateWishlistItem
})

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
    wishlistStorage.save(updated)

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

    wishlistStorage.save(filtered)

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
    return wishlistStorage.getAll()
  },

  getCount(): number {
    return this.getAll().length
  },
  
  clear() {
    wishlistStorage.clear()

    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('wishlist-updated', {
      detail: { action: 'clear' }
    }))
  },

  // Force cleanup (useful for testing or manual cleanup)
  cleanup(): WishlistItem[] {
    return wishlistStorage.forceCleanup()
  },

  // Check if cleanup is needed
  needsCleanup(): boolean {
    return needsVersionCleanup(WISHLIST_VERSION_KEY, WISHLIST_VERSION)
  }
}

// Saved for Later (from cart)
export interface SavedForLaterItem {
  variantId: string
  productId: string
  quantity: number
  savedAt: string
  product?: Product
  variant?: any
}

// Validator for saved for later items
const validateSavedForLaterItem = (item: any): item is SavedForLaterItem => {
  return (
    item &&
    typeof item.variantId === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.quantity === 'number' &&
    typeof item.savedAt === 'string' &&
    item.quantity > 0
  )
}

// Create versioned storage for saved for later
const savedForLaterStorage = createVersionedStorage<SavedForLaterItem>({
  storageKey: SAVED_FOR_LATER_KEY,
  versionKey: SAVED_FOR_LATER_VERSION_KEY,
  currentVersion: SAVED_FOR_LATER_VERSION,
  maxItems: MAX_SAVED_FOR_LATER,
  retentionDays: DATA_RETENTION_DAYS,
  validator: validateSavedForLaterItem
})

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
    savedForLaterStorage.save(updated)

    return true
  },

  remove(variantId: string): boolean {
    if (typeof window === 'undefined') return false

    const items = this.getAll()
    const filtered = items.filter(item => item.variantId !== variantId)

    if (filtered.length === items.length) {
      return false
    }

    savedForLaterStorage.save(filtered)
    return true
  },

  getAll(): SavedForLaterItem[] {
    return savedForLaterStorage.getAll()
  },

  clear() {
    savedForLaterStorage.clear()
  },

  // Force cleanup (useful for testing or manual cleanup)
  cleanup(): SavedForLaterItem[] {
    return savedForLaterStorage.forceCleanup()
  },

  // Check if cleanup is needed
  needsCleanup(): boolean {
    return needsVersionCleanup(SAVED_FOR_LATER_VERSION_KEY, SAVED_FOR_LATER_VERSION)
  }
}

// Compare Products
export interface CompareItem {
  productId: string
  product?: Product
  addedAt: string
}

// Validator for compare items
const validateCompareItem = (item: any): item is CompareItem => {
  return (
    item &&
    typeof item.productId === 'string' &&
    typeof item.addedAt === 'string' &&
    (!item.product || (
      typeof item.product.id === 'number' &&
      typeof item.product.title === 'string'
    ))
  )
}

// Migrator for compare items (adds addedAt if missing)
const migrateCompareItems = (oldData: any[]): CompareItem[] => {
  if (!Array.isArray(oldData)) return []

  return oldData.map((item: any) => {
    if (item && typeof item.productId === 'string') {
      return {
        productId: item.productId,
        product: item.product,
        addedAt: item.addedAt || new Date().toISOString()
      }
    }
    return null
  }).filter(Boolean) as CompareItem[]
}

// Create versioned storage for compare products
const compareStorage = createVersionedStorage<CompareItem>({
  storageKey: COMPARE_KEY,
  versionKey: COMPARE_VERSION_KEY,
  currentVersion: COMPARE_VERSION,
  maxItems: MAX_COMPARE,
  retentionDays: DATA_RETENTION_DAYS,
  validator: validateCompareItem,
  migrator: migrateCompareItems
})

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

    const newItem: CompareItem = {
      productId,
      product,
      addedAt: new Date().toISOString()
    }

    const updated = [...items, newItem]
    compareStorage.save(updated)

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

    compareStorage.save(filtered)
    window.dispatchEvent(new CustomEvent('compare-updated'))
    return true
  },

  getAll(): CompareItem[] {
    return compareStorage.getAll()
  },

  clear() {
    compareStorage.clear()
    window.dispatchEvent(new CustomEvent('compare-updated'))
  },

  // Force cleanup (useful for testing or manual cleanup)
  cleanup(): CompareItem[] {
    return compareStorage.forceCleanup()
  },

  // Check if cleanup is needed
  needsCleanup(): boolean {
    return needsVersionCleanup(COMPARE_VERSION_KEY, COMPARE_VERSION)
  }
}

/**
 * Global cleanup utilities
 */
export const clientStorage = {
  /**
   * Check if any storage needs cleanup
   */
  needsCleanup(): boolean {
    return (
      recentlyViewed.needsCleanup() ||
      wishlist.needsCleanup() ||
      savedForLater.needsCleanup() ||
      compareProducts.needsCleanup()
    )
  },

  /**
   * Force cleanup of all storage types
   */
  cleanupAll(): {
    recentlyViewed: RecentlyViewedItem[]
    wishlist: WishlistItem[]
    savedForLater: SavedForLaterItem[]
    compare: CompareItem[]
  } {
    return {
      recentlyViewed: recentlyViewed.cleanup(),
      wishlist: wishlist.cleanup(),
      savedForLater: savedForLater.cleanup(),
      compare: compareProducts.cleanup()
    }
  },

  /**
   * Clear all storage
   */
  clearAll(): void {
    recentlyViewed.clear()
    wishlist.clear()
    savedForLater.clear()
    compareProducts.clear()
  },

  /**
   * Get storage statistics
   */
  getStats(): {
    recentlyViewed: { count: number; needsCleanup: boolean }
    wishlist: { count: number; needsCleanup: boolean }
    savedForLater: { count: number; needsCleanup: boolean }
    compare: { count: number; needsCleanup: boolean }
  } {
    return {
      recentlyViewed: {
        count: recentlyViewed.getAll().length,
        needsCleanup: recentlyViewed.needsCleanup()
      },
      wishlist: {
        count: wishlist.getCount(),
        needsCleanup: wishlist.needsCleanup()
      },
      savedForLater: {
        count: savedForLater.getAll().length,
        needsCleanup: savedForLater.needsCleanup()
      },
      compare: {
        count: compareProducts.getAll().length,
        needsCleanup: compareProducts.needsCleanup()
      }
    }
  }
}
}
