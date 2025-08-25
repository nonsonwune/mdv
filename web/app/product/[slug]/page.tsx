import { API_BASE } from "../../../lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ProductResponse } from "../../../lib/api-types";
import type { ProductImage, Variant } from "../../../lib/types";

async function getProduct(idOrSlug: string): Promise<ProductResponse | null> {
  const res = await fetch(`${API_BASE}/api/products/${idOrSlug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();
  const v0 = product.variants?.[0];
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm underline">← Back</Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          {product.images?.[0]?.url ? (
            <Image src={product.images[0].url} alt={product.images[0].alt_text || product.title || "Product image"} width={product.images[0].width ?? 1000} height={product.images[0].height ?? 1000} className="w-full aspect-square object-cover rounded bg-neutral-100" />
          ) : (
            <div className="aspect-square bg-neutral-100" />
          )}
          {product.images && product.images.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.slice(0, 8).map((img) => (
                img.url && img.id ? (
                  <Image key={img.id} src={img.url} alt={img.alt_text || product.title || "Product image"} width={img.width ?? 300} height={img.height ?? 300} className="w-full aspect-square object-cover rounded bg-neutral-100" />
                ) : null
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>{product.title}</h1>
          {v0 ? (
            <div className="mt-2 text-base flex items-center gap-2">
              <span>₦{Number(v0.price || 0).toLocaleString()}</span>
              {typeof product.compare_at_price === "number" && Number(product.compare_at_price) > Number(v0.price || 0) ? (
                <>
                  <span className="line-through text-neutral-500 text-sm">₦{Number(product.compare_at_price).toLocaleString()}</span>
                  <span className="text-xs bg-[var(--maroon-700)] text-white rounded px-2 py-0.5">
                    -{Math.round((1 - Number(v0.price) / Number(product.compare_at_price)) * 100)}%
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
          <form className="mt-6" action="/cart" method="GET">
            {product.variants?.length && product.variants.length > 1 ? (
              <label className="block text-sm mb-3" style={{ color: "var(--ink-600)" }}>
                Choose variant:
                <select name="add" className="border p-2 rounded ml-2">
                  {product.variants.map((v) => (
                    v.id ? (
                      <option key={v.id} value={v.id}>
                        {[v.size, v.color].filter(Boolean).join(" / ") || v.sku || `Variant ${v.id}`}
                      </option>
                    ) : null
                  ))}
                </select>
              </label>
            ) : (
              product.variants?.[0] ? <input type="hidden" name="add" value={product.variants[0].id} /> : null
            )}
            <div className="sticky bottom-4 flex items-center gap-3 bg-white/80 backdrop-blur mt-4 p-3 rounded border border-neutral-200">
              <button type="submit" className="btn-primary">Add to Cart</button>
              <Link href="/cart" className="underline text-sm">Go to cart</Link>
            </div>
          </form>
          {product.description ? (
            <p className="mt-6 text-sm" style={{ color: "var(--ink-600)" }}>{product.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

