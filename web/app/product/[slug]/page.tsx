import { API_BASE } from "../../../lib/api";
import { notFound } from "next/navigation";
import type { ProductResponse } from "../../../lib/api-types";
import ProductPageClient from "../../../components/products/ProductPageClient";
import InteractiveProductDetail from "../../../components/products/InteractiveProductDetail";

async function getProduct(idOrSlug: string): Promise<ProductResponse | null> {
  const res = await fetch(`${API_BASE}/api/products/${idOrSlug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();

  return (
    <ProductPageClient product={product}>
      <InteractiveProductDetail product={product} />
    </ProductPageClient>
  );
}

