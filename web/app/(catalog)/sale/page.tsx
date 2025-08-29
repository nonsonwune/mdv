import { api } from "../../../lib/api-client"
import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    const data = await api<ProductListResponse>("/api/products/sale?page_size=50")
    return (data.items as Product[]) || []
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

