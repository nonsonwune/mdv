"use client"

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'
import type { Product } from '../lib/types'

interface WishlistItem {
  id: number
  product_id: number
  variant_id?: number
  product_name: string
  product_slug: string
  price: number
  image_url?: string
  added_at: string
  in_stock: boolean
}

interface WishlistResponse {
  user_id: number
  items: WishlistItem[]
  total_items: number
  created_at: string
  updated_at: string
}

export function useWishlist() {
  const { user, isAuthenticated } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load wishlist from API when user is authenticated
  const loadWishlist = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setItems([])
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const response = await api<WishlistResponse>('/api/wishlist')
      setItems(response.items)
    } catch (error) {
      console.error('Failed to load wishlist:', error)
      setError('Failed to load wishlist')
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  // Load wishlist on mount and when auth state changes
  useEffect(() => {
    loadWishlist()
  }, [loadWishlist])

  // Dispatch wishlist update events
  useEffect(() => {
    if (!isLoading) {
      window.dispatchEvent(new CustomEvent('wishlist-updated', {
        detail: { count: items.length }
      }))
    }
  }, [items, isLoading])

  const addItem = useCallback(async (productId: number, variantId?: number) => {
    if (!isAuthenticated || !user) {
      throw new Error('Must be logged in to add items to wishlist')
    }

    try {
      await api('/api/wishlist/items', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId
        })
      })

      // Reload wishlist to get updated data
      await loadWishlist()
      return true
    } catch (error) {
      console.error('Failed to add item to wishlist:', error)
      throw error
    }
  }, [isAuthenticated, user, loadWishlist])

  const removeItem = useCallback(async (productId: number, variantId?: number) => {
    if (!isAuthenticated || !user) {
      throw new Error('Must be logged in to remove items from wishlist')
    }

    try {
      await api('/api/wishlist/items', {
        method: 'DELETE',
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId
        })
      })

      // Reload wishlist to get updated data
      await loadWishlist()
      return true
    } catch (error) {
      console.error('Failed to remove item from wishlist:', error)
      throw error
    }
  }, [isAuthenticated, user, loadWishlist])

  const toggleItem = useCallback(async (productId: number, variantId?: number) => {
    if (!isAuthenticated || !user) {
      throw new Error('Must be logged in to modify wishlist')
    }

    try {
      const response = await api('/api/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId
        })
      })

      // Reload wishlist to get updated data
      await loadWishlist()
      return response.action === 'added'
    } catch (error) {
      console.error('Failed to toggle wishlist item:', error)
      throw error
    }
  }, [isAuthenticated, user, loadWishlist])

  const clearWishlist = useCallback(async () => {
    if (!isAuthenticated || !user) {
      throw new Error('Must be logged in to clear wishlist')
    }

    try {
      await api('/api/wishlist/clear', {
        method: 'DELETE'
      })

      // Reload wishlist to get updated data
      await loadWishlist()
      return true
    } catch (error) {
      console.error('Failed to clear wishlist:', error)
      throw error
    }
  }, [isAuthenticated, user, loadWishlist])

  const isInWishlist = useCallback((productId: number, variantId?: number) => {
    return items.some(item =>
      item.product_id === productId &&
      (variantId ? item.variant_id === variantId : !item.variant_id)
    )
  }, [items])

  const checkWishlistStatus = useCallback(async (productId: number, variantId?: number) => {
    if (!isAuthenticated || !user) {
      return false
    }

    try {
      const response = await api<{in_wishlist: boolean}>(`/api/wishlist/check/${productId}${variantId ? `?variant_id=${variantId}` : ''}`)
      return response.in_wishlist
    } catch (error) {
      console.error('Failed to check wishlist status:', error)
      return false
    }
  }, [isAuthenticated, user])

  const moveToCart = useCallback(async (itemId: number) => {
    if (!isAuthenticated || !user) {
      throw new Error('Must be logged in to move items to cart')
    }

    try {
      await api('/api/wishlist/move-to-cart', {
        method: 'POST',
        body: JSON.stringify({
          item_id: itemId
        })
      })

      // Reload wishlist to get updated data
      await loadWishlist()
      return true
    } catch (error) {
      console.error('Failed to move to cart:', error)
      throw error
    }
  }, [isAuthenticated, user, loadWishlist])

  const getItemCount = useCallback(() => items.length, [items])

  return {
    items,
    count: items.length,
    isLoading,
    error,
    addItem,
    removeItem,
    toggleItem,
    clearWishlist,
    isInWishlist,
    checkWishlistStatus,
    moveToCart,
    getItemCount,
    loadWishlist,
    isAuthenticated
  }
}
