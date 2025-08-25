"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useComparison } from '../../hooks/useComparison'
import { useCart } from '../../hooks/useCart'
import { Button, Card, EmptyState, Modal } from '../ui'
import { formatNaira } from '../../lib/format'
import type { Product } from '../../lib/types'

export default function ProductComparison() {
  const { products, removeProduct, clearComparison } = useComparison()
  const { addToCart } = useCart()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [addingToCart, setAddingToCart] = useState<number | null>(null)

  const handleAddToCart = async (product: Product) => {
    const variant = product.variants?.[0]
    if (!variant) return
    
    setAddingToCart(product.id)
    try {
      await addToCart(variant.id, 1)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setAddingToCart(null)
    }
  }

  const getProductFeatures = (product: Product) => {
    const features: Record<string, string | number> = {}
    
    // Price
    features['Price'] = product.variants?.[0]?.price || 0
    
    // Extract features from description or use mock data
    if (product.description) {
      // Simple feature extraction from description
      if (product.description.toLowerCase().includes('cotton')) {
        features['Material'] = 'Cotton'
      } else if (product.description.toLowerCase().includes('polyester')) {
        features['Material'] = 'Polyester'
      } else {
        features['Material'] = 'Mixed'
      }
    }
    
    // Available sizes
    const sizes = product.variants?.map(v => v.size).filter(Boolean) || []
    if (sizes.length > 0) {
      features['Available Sizes'] = [...new Set(sizes)].join(', ')
    }
    
    // Available colors
    const colors = product.variants?.map(v => v.color).filter(Boolean) || []
    if (colors.length > 0) {
      features['Available Colors'] = [...new Set(colors)].join(', ')
    }
    
    // Mock additional features
    features['Rating'] = (Math.random() * 2 + 3).toFixed(1) + ' ★'
    features['Reviews'] = Math.floor(Math.random() * 100 + 10)
    features['Shipping'] = 'Free on orders over ₦50,000'
    features['Return Policy'] = '7 days'
    
    return features
  }

  if (products.length === 0) {
    return null
  }

  const allFeatures = new Set<string>()
  const productFeatures = products.map(product => {
    const features = getProductFeatures(product)
    Object.keys(features).forEach(key => allFeatures.add(key))
    return features
  })

  return (
    <>
      {/* Floating Compare Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-maroon-700 text-white px-4 py-3 rounded-full shadow-lg hover:bg-maroon-800 transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Compare ({products.length})
      </button>

      {/* Comparison Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Product Comparison"
        size="xl"
      >
        <div className="overflow-x-auto">
          {products.length === 1 ? (
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Add more products to compare"
              description="Select at least 2 products to see a comparison"
            />
          ) : (
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left p-3 font-medium">Feature</th>
                  {products.map(product => (
                    <th key={product.id} className="p-3">
                      <div className="text-center">
                        {/* Product Image */}
                        <div className="relative w-24 h-24 mx-auto mb-2">
                          {product.images?.[0]?.url ? (
                            <Image
                              src={product.images[0].url}
                              alt={product.title}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-200 rounded-lg" />
                          )}
                          
                          {/* Remove button */}
                          <button
                            onClick={() => removeProduct(product.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            aria-label="Remove from comparison"
                          >
                            ×
                          </button>
                        </div>
                        
                        {/* Product Title */}
                        <Link 
                          href={`/product/${product.slug}`}
                          className="text-sm font-medium hover:text-maroon-700 line-clamp-2"
                        >
                          {product.title}
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(allFeatures).map(feature => (
                  <tr key={feature} className="border-t">
                    <td className="p-3 font-medium text-sm">{feature}</td>
                    {products.map((product, index) => {
                      const value = productFeatures[index][feature]
                      return (
                        <td key={product.id} className="p-3 text-center text-sm">
                          {feature === 'Price' ? (
                            <span className="font-semibold text-maroon-700">
                              {formatNaira(value as number)}
                            </span>
                          ) : (
                            value || '—'
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                
                {/* Action Row */}
                <tr className="border-t bg-neutral-50">
                  <td className="p-3">Actions</td>
                  {products.map(product => (
                    <td key={product.id} className="p-3 text-center">
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          disabled={addingToCart === product.id}
                          loading={addingToCart === product.id}
                          className="w-full"
                        >
                          Add to Cart
                        </Button>
                        <Link href={`/product/${product.slug}`}>
                          <Button variant="secondary" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
          
          {products.length > 1 && (
            <div className="mt-4 pt-4 border-t flex justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={clearComparison}
              >
                Clear All
              </Button>
              <p className="text-sm text-neutral-600">
                You can compare up to 4 products
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
