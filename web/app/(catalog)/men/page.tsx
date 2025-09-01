import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    // Use direct fetch instead of api client for server-side rendering
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mdv-web-production.up.railway.app'
    const url = `${baseUrl}/api/products/category/men?page_size=100`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control to prevent stale data
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error('Men page: Failed to fetch products:', response.status, response.statusText)
      return []
    }

    const data = await response.json() as ProductListResponse

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

