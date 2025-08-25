"use client"

import { useState, useEffect, useCallback } from "react"
import { addItemWithRecovery, fetchCartOrCreate } from "../lib/cart"
import { useToast } from "../app/_components/ToastProvider"

export function useCart() {
  const [cartCount, setCartCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  // Load cart count on mount
  useEffect(() => {
    updateCartCount()
  }, [])

  const updateCartCount = async () => {
    try {
      const cart = await fetchCartOrCreate()
      const count = cart?.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0
      setCartCount(count)
    } catch (error) {
      console.error("Failed to update cart count:", error)
    }
  }

  const addToCart = useCallback(async (variantId: number, quantity: number = 1) => {
    setIsLoading(true)
    try {
      await addItemWithRecovery(variantId, quantity)
      await updateCartCount()
      toast.success("Added to cart", `${quantity} item${quantity > 1 ? 's' : ''} added to your cart`)
      return true
    } catch (error) {
      toast.error("Failed to add to cart", "Please try again")
      console.error("Add to cart error:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  return {
    cartCount,
    isLoading,
    addToCart,
    updateCartCount,
  }
}
