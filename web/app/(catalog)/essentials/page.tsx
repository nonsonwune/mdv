import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    // DEPLOYMENT RELIABILITY FIX: Handle build-time API unavailability
    // During concurrent deployment, API may not be ready during Next.js build
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mdv-web-production.up.railway.app'
    const url = `${baseUrl}/api/products/category/essentials?page_size=100`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Use default caching for static generation
      next: { revalidate: 60 },
      // Add timeout to prevent build hanging during concurrent deployment
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      console.error('Essentials page: Failed to fetch products:', response.status, response.statusText)
      return []
    }

    const data = await response.json() as ProductListResponse

    return (data.items as Product[]) || []
  } catch (error) {
    console.error('Essentials page: Error fetching products (build-time fallback):', error)
    // CRITICAL: Return empty array instead of throwing to prevent build failure
    // Pages will load with empty state and fetch data client-side
    return []
  }
}

export default async function EssentialsCategoryPage() {
  const products = await getProducts()
  
  return (
    <CategoryLayout
      title="Everyday Essentials"
      description="Quality basics and wardrobe staples at unbeatable prices."
      products={products}
      category="essentials"
    />
  )
}

