/**
 * Simple recommendation engine that works with existing product API
 */

import { api } from './api-client'
import type { Product } from './types'
import type { ProductListResponse } from './api-types'

// Get recommendations based on product attributes
export async function getProductRecommendations(
  product: Product,
  limit: number = 4
): Promise<Product[]> {
  try {
    // Try to get products from the API
    const response = await api<ProductListResponse>('/api/products?page_size=50')
    const allProducts = (response.items as Product[]) || []
    
    // Filter out the current product
    const otherProducts = allProducts.filter(p => p.id !== product.id)
    
    // Score products based on similarity
    const scoredProducts = otherProducts.map(p => {
      let score = 0
      
      // Same vendor/brand gets high score
      if (p.vendor === product.vendor) score += 5
      
      // Same product type gets high score
      if (p.product_type === product.product_type) score += 4
      
      // Similar price range
      const currentPrice = product.variants?.[0]?.price || 0
      const otherPrice = p.variants?.[0]?.price || 0
      const priceDiff = Math.abs(currentPrice - otherPrice)
      if (priceDiff < 5000) score += 3
      else if (priceDiff < 10000) score += 2
      else if (priceDiff < 20000) score += 1
      
      // Shared tags
      const sharedTags = p.tags?.filter(tag => product.tags?.includes(tag)) || []
      score += sharedTags.length
      
      // Random factor for variety
      score += Math.random() * 2
      
      return { product: p, score }
    })
    
    // Sort by score and return top items
    scoredProducts.sort((a, b) => b.score - a.score)
    return scoredProducts.slice(0, limit).map(item => item.product)
  } catch (error) {
    console.error('Failed to get recommendations:', error)
    return []
  }
}

// Get trending products (just returns popular items)
export async function getTrendingProducts(limit: number = 8): Promise<Product[]> {
  try {
    const response = await api<ProductListResponse>(`/api/products?page_size=${limit}`)
    return (response.items as Product[]) || []
  } catch (error) {
    console.error('Failed to get trending products:', error)
    return []
  }
}

// Get products frequently bought together (simple mock)
export async function getFrequentlyBoughtTogether(
  product: Product,
  limit: number = 3
): Promise<Product[]> {
  try {
    // Get products from similar category/type
    const response = await api<ProductListResponse>('/api/products?page_size=20')
    const allProducts = (response.items as Product[]) || []
    
    // Filter for complementary products
    const complementary = allProducts.filter(p => {
      if (p.id === product.id) return false
      
      // Different product type but same category
      if (p.product_type !== product.product_type) {
        // Check if they share category tags
        const hasSharedCategory = p.tags?.some(tag => 
          product.tags?.includes(tag) && ['men', 'women', 'essentials'].includes(tag)
        )
        return hasSharedCategory
      }
      
      return false
    })
    
    // Shuffle and return limited results
    return complementary
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
  } catch (error) {
    console.error('Failed to get frequently bought together:', error)
    return []
  }
}

// Get personalized recommendations based on user's recently viewed
export async function getPersonalizedRecommendations(
  recentlyViewedIds: string[],
  limit: number = 8
): Promise<Product[]> {
  if (recentlyViewedIds.length === 0) {
    // No history, return trending
    return getTrendingProducts(limit)
  }
  
  try {
    const response = await api<ProductListResponse>('/api/products?page_size=50')
    const allProducts = (response.items as Product[]) || []
    
    // Get the recently viewed products
    const recentProducts = allProducts.filter(p => 
      recentlyViewedIds.includes(p.id!)
    )
    
    if (recentProducts.length === 0) {
      return getTrendingProducts(limit)
    }
    
    // Collect attributes from recently viewed
    const viewedVendors = new Set(recentProducts.map(p => p.vendor).filter(Boolean))
    const viewedTypes = new Set(recentProducts.map(p => p.product_type).filter(Boolean))
    const viewedTags = new Set(recentProducts.flatMap(p => p.tags || []))
    
    // Score other products based on similarity to viewed items
    const scoredProducts = allProducts
      .filter(p => !recentlyViewedIds.includes(p.id!))
      .map(p => {
        let score = 0
        
        if (p.vendor && viewedVendors.has(p.vendor)) score += 3
        if (p.product_type && viewedTypes.has(p.product_type)) score += 3
        
        const matchingTags = p.tags?.filter(tag => viewedTags.has(tag)) || []
        score += matchingTags.length * 2
        
        // Add randomness for variety
        score += Math.random() * 3
        
        return { product: p, score }
      })
    
    // Sort by score and return top items
    scoredProducts.sort((a, b) => b.score - a.score)
    return scoredProducts.slice(0, limit).map(item => item.product)
  } catch (error) {
    console.error('Failed to get personalized recommendations:', error)
    return getTrendingProducts(limit)
  }
}
