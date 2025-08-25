"use client"

import { useState, useEffect, useCallback } from 'react'
import type { Product } from '../lib/types'

const MAX_COMPARISON_ITEMS = 4
const STORAGE_KEY = 'mdv_comparison'

export function useComparison() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Product[]
        setProducts(parsed.slice(0, MAX_COMPARISON_ITEMS))
      }
    } catch (error) {
      console.error('Failed to load comparison products:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save to localStorage whenever products change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
      } catch (error) {
        console.error('Failed to save comparison products:', error)
      }
    }
  }, [products, isLoading])

  const addProduct = useCallback((product: Product) => {
    setProducts(prev => {
      // Check if already in comparison
      if (prev.some(p => p.id === product.id)) {
        return prev
      }
      
      // Add to comparison (limit to max items)
      const updated = [...prev, product].slice(0, MAX_COMPARISON_ITEMS)
      return updated
    })
  }, [])

  const removeProduct = useCallback((productId: number) => {
    setProducts(prev => prev.filter(p => p.id !== productId))
  }, [])

  const toggleProduct = useCallback((product: Product) => {
    setProducts(prev => {
      const exists = prev.some(p => p.id === product.id)
      if (exists) {
        return prev.filter(p => p.id !== product.id)
      } else {
        return [...prev, product].slice(0, MAX_COMPARISON_ITEMS)
      }
    })
  }, [])

  const clearComparison = useCallback(() => {
    setProducts([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const isInComparison = useCallback((productId: number) => {
    return products.some(p => p.id === productId)
  }, [products])

  const canAddMore = products.length < MAX_COMPARISON_ITEMS

  return {
    products,
    count: products.length,
    maxItems: MAX_COMPARISON_ITEMS,
    canAddMore,
    isLoading,
    addProduct,
    removeProduct,
    toggleProduct,
    clearComparison,
    isInComparison,
  }
}
