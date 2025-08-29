import { api } from "../../../lib/api-client"
import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    const data = await api<ProductListResponse>("/api/products/category/women?page_size=50")
    return (data.items as Product[]) || []
  } catch {
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

