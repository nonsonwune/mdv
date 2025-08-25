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
      
      // Similar price range
      const currentPrice = product.variants?.[0]?.price || 0
      const otherPrice = p.variants?.[0]?.price || 0
      const priceDiff = Math.abs(currentPrice - otherPrice)
      if (priceDiff < 5000) score += 5
      else if (priceDiff < 10000) score += 3
      else if (priceDiff < 20000) score += 1
      
      // Similar title (basic text similarity)
      const titleSimilarity = p.title.toLowerCase().split(' ').filter(word => 
        product.title.toLowerCase().includes(word)
      ).length
      score += titleSimilarity * 2
      
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
      
      // Just return random different products for now
      return Math.random() > 0.5
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
      recentlyViewedIds.includes(String(p.id))
    )
    
    if (recentProducts.length === 0) {
      return getTrendingProducts(limit)
    }
    
    // Collect attributes from recently viewed
    const viewedTitles = new Set(recentProducts.flatMap(p => 
      p.title.toLowerCase().split(' ')
    ))
    
    // Score other products based on similarity to viewed items
    const scoredProducts = allProducts
      .filter(p => !recentlyViewedIds.includes(String(p.id)))
      .map(p => {
        let score = 0
        
        // Score based on title similarity
        const titleWords = p.title.toLowerCase().split(' ')
        const matchingWords = titleWords.filter(word => viewedTitles.has(word))
        score += matchingWords.length * 2
        
        // Score based on price similarity
        const avgViewedPrice = recentProducts.reduce((sum, rp) => 
          sum + (rp.variants?.[0]?.price || 0), 0
        ) / recentProducts.length
        const priceDiff = Math.abs((p.variants?.[0]?.price || 0) - avgViewedPrice)
        if (priceDiff < 10000) score += 3
        else if (priceDiff < 20000) score += 1
        
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
