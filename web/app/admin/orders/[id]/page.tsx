import Link from "next/link"
import { API_BASE } from "../../../../lib/api"
import { cookies } from "next/headers"
// import type { OrderResponse } from "../../../../lib/api-types"

async function getOrder(id: string): Promise<any | null> {
  const token = cookies().get("mdv_token")?.value
  const res = await fetch(`${API_BASE}/api/orders/${id}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) return null
  return res.json()
}

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id)
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>Order #{params.id}</h1>
        <Link href="/admin/orders" className="underline text-sm">← Back to Orders</Link>
      </div>
      {!order ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-600)" }}>Order not found or backend endpoint not available.</p>
      ) : (
        <div className="mt-6 space-y-2 text-sm">
          <div>Status: {order.status || "Unknown"}</div>
          <div>Email: {order.email || order.customer_email || ""}</div>
          <div>Created: {new Date(order.created_at || order.createdAt || Date.now()).toLocaleString()}</div>
          <div className="mt-4">
            <div className="font-medium">Items</div>
            <div className="mt-2 border border-neutral-200 rounded divide-y">
              {(order.items || []).map((it: any) => (
                <div key={it.id} className="p-2 flex items-center justify-between">
                  <div>Variant #{it.variant_id}</div>
                  <div>Qty: {it.qty}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

