import { api } from "../../../lib/api-client"
import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    const data = await api<ProductListResponse>("/api/products?page_size=50")
    // Filter for sale items (those with compare_at_price > price)
    const products = (data.items as Product[]) || []
    return products.filter(p => {
      const price = p.variants?.[0]?.price || 0
      return p.compare_at_price && p.compare_at_price > price
    })
  } catch {
    return []
  }
}

export default async function SaleCategoryPage() {
  const products = await getProducts()
  
  return (
    <CategoryLayout
      title="Sale & Clearance"
      description="🔥 Up to 70% off! Limited time offers on last-season favorites."
      products={products}
      category="sale"
    />
  )
}

