"use client"

import { useState, useEffect, useCallback } from 'react'
import type { Product } from '../lib/types'

const STORAGE_KEY = 'mdv_wishlist'

export function useWishlist() {
  const [items, setItems] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Product[]
        setItems(parsed)
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('wishlist-updated', { 
          detail: { count: items.length } 
        }))
      } catch (error) {
        console.error('Failed to save wishlist:', error)
      }
    }
  }, [items, isLoading])

  const addItem = useCallback((product: Product) => {
    setItems(prev => {
      // Check if already in wishlist
      if (prev.some(p => p.id === product.id)) {
        return prev
      }
      return [...prev, product]
    })
    return true
  }, [])

  const removeItem = useCallback((productId: number) => {
    setItems(prev => prev.filter(p => p.id !== productId))
  }, [])

  const toggleItem = useCallback((product: Product) => {
    setItems(prev => {
      const exists = prev.some(p => p.id === product.id)
      if (exists) {
        return prev.filter(p => p.id !== product.id)
      } else {
        return [...prev, product]
      }
    })
  }, [])

  const clearWishlist = useCallback(() => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const isInWishlist = useCallback((productId: number) => {
    return items.some(p => p.id === productId)
  }, [items])

  const moveToCart = useCallback(async (productId: number) => {
    const product = items.find(p => p.id === productId)
    if (!product || !product.variants?.[0]) return false
    
    try {
      // Import cart functions dynamically to avoid circular dependencies
      const { addItemWithRecovery } = await import('../lib/cart')
      await addItemWithRecovery(product.variants[0].id, 1)
      
      // Remove from wishlist after adding to cart
      removeItem(productId)
      return true
    } catch (error) {
      console.error('Failed to move to cart:', error)
      return false
    }
  }, [items, removeItem])

  const getItemCount = useCallback(() => items.length, [items])

  return {
    items,
    count: items.length,
    isLoading,
    addItem,
    removeItem,
    toggleItem,
    clearWishlist,
    isInWishlist,
    moveToCart,
    getItemCount,
  }
}
