import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    // Use direct fetch instead of api client for server-side rendering
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mdv-web-production.up.railway.app'
    const url = `${baseUrl}/api/products/category/women?page_size=100`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Use default caching for static generation
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      console.error('Women page: Failed to fetch products:', response.status, response.statusText)
      return []
    }

    const data = await response.json() as ProductListResponse

    return (data.items as Product[]) || []
  } catch (error) {
    console.error('Women page: Error fetching products:', error)
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

