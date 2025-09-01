import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    // Use direct fetch instead of api client for server-side rendering
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mdv-web-production.up.railway.app'
    const url = `${baseUrl}/api/products/category/men?page_size=100`

    console.log('Men page (server): Fetching from URL:', url)

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control to prevent stale data
      cache: 'no-store'
    })

    console.log('Men page (server): Response status:', response.status)

    if (!response.ok) {
      console.error('Men page (server): Response not OK:', response.status, response.statusText)
      return []
    }

    const data = await response.json() as ProductListResponse
    console.log('Men page (server): Items count:', data?.items?.length || 0)
    console.log('Men page (server): First item:', data?.items?.[0]?.title || 'none')

    return (data.items as Product[]) || []
  } catch (error) {
    console.error('Men page (server): Error fetching products:', error)
    return []
  }
}

export default async function MenCategoryPage() {
  const products = await getProducts()

  console.log('Men page (server): Final products count:', products.length)

  return (
    <CategoryLayout
      title="Men's Collection"
      description="Discover our curated selection of men's fashion essentials."
      products={products}
      category="men"
    />
  )
}

