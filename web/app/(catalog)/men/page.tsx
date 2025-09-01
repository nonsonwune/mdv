"use client"

import { useState, useEffect } from "react"
import { api } from "../../../lib/api-client"
import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

export default function MenCategoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProducts() {
      try {
        console.log('Men page (client): Fetching products from /api/products/category/men')
        setLoading(true)
        const data = await api<ProductListResponse>("/api/products/category/men?page_size=100")
        console.log('Men page (client): API response:', JSON.stringify(data, null, 2))
        console.log('Men page (client): Items count:', data?.items?.length || 0)
        setProducts((data.items as Product[]) || [])
      } catch (error) {
        console.error('Men page (client): Error fetching products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (loading) {
    return (
      <CategoryLayout
        title="Men's Collection"
        description="Discover our curated selection of men's fashion essentials."
        products={[]}
        category="men"
      />
    )
  }

  return (
    <CategoryLayout
      title="Men's Collection"
      description="Discover our curated selection of men's fashion essentials."
      products={products}
      category="men"
    />
  )
}

