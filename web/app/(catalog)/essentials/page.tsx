import { api } from "../../../lib/api-client"
import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    const data = await api<ProductListResponse>("/api/products?page_size=50")
    return (data.items as Product[]) || []
  } catch {
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

