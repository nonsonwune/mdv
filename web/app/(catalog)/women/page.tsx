import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    // DEPLOYMENT RELIABILITY FIX: Handle build-time API unavailability
    // During concurrent deployment, API may not be ready during Next.js build
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mdv-web-production.up.railway.app'
    const url = `${baseUrl}/api/products/category/women?page_size=100`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Revalidate every 60 seconds for production
      next: { revalidate: 60 },
      // Add timeout to prevent build hanging during concurrent deployment
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      console.error('Women page: Failed to fetch products:', response.status, response.statusText)
      // Return empty array to allow build to continue
      return []
    }

    const data = await response.json() as ProductListResponse

    return (data.items as Product[]) || []
  } catch (error) {
    console.error('Women page: Error fetching products (build-time fallback):', error)
    // CRITICAL: Return empty array instead of throwing to prevent build failure
    // Pages will load with empty state and fetch data client-side
    return []
  }
}

export default async function WomenCategoryPage() {
  const products = await getProducts()
  
  return (
    <CategoryLayout
      title="Women's Collection"
      description="Explore elegant and contemporary fashion pieces designed for the modern woman."
      products={products}
      category="women"
    />
  )
}

