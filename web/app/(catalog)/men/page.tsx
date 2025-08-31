import { api } from "../../../lib/api-client"
import type { ProductListResponse } from "../../../lib/api-types"
import type { Product } from "../../../lib/types"
import CategoryLayout from "../../../components/catalog/CategoryLayout"

async function getProducts(): Promise<Product[]> {
  try {
    const data = await api<ProductListResponse>("/api/products/category/men?page_size=100")
    return (data.items as Product[]) || []
  } catch {
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

