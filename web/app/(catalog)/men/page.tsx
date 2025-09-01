import { api } from "../../../lib/api-client"
import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    console.log('Men page: Fetching products from /api/products/category/men')
    const data = await api<ProductListResponse>("/api/products/category/men?page_size=100")
    console.log('Men page: API response:', JSON.stringify(data, null, 2))
    console.log('Men page: Items count:', data?.items?.length || 0)
    return (data.items as Product[]) || []
  } catch (error) {
    console.error('Men page: Error fetching products:', error)
    return []
  }
}

export default async function MenCategoryPage() {
  const products = await getProducts()

  return (
    <CategoryLayout
      title="Men's Collection"
      description="Discover our curated selection of men's fashion essentials."
      products={products}
      category="men"
    />
  )
}

