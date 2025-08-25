import { api } from "../../lib/api-client"
import type { ProductListResponse } from "../../lib/api-types"
import type { Product } from "../../lib/types"
import EnhancedSearchPage from "./client-page"

function getQuery(searchParams: { [key: string]: string | string[] | undefined }) {
  const v = searchParams?.query
  return Array.isArray(v) ? v[0] : v || ""
}

export default async function SearchPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const q = getQuery(searchParams).trim()
  
  // Fetch all products for filtering, or search results if query exists
  let products: Product[] = []
  
  try {
    if (q) {
      // Search for specific products
      const data = await api<ProductListResponse>(`/api/products?q=${encodeURIComponent(q)}&page_size=100`)
      products = (data.items as Product[]) || []
    } else {
      // Get all products for browsing
      const data = await api<ProductListResponse>(`/api/products?page_size=100`)
      products = (data.items as Product[]) || []
    }
  } catch (error) {
    console.error("Failed to fetch products:", error)
    products = []
  }
  
  return <EnhancedSearchPage initialProducts={products} initialQuery={q} />
}

