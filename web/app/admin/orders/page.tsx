import Link from "next/link"
import { API_BASE } from "../../../lib/api"
import { cookies } from "next/headers"
// import type { OrderListResponse } from "../../../lib/api-types"

async function getOrders(): Promise<any[]> {
  try {
    const token = cookies().get("mdv_token")?.value
    const res = await fetch(`${API_BASE}/api/orders?limit=20`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!res.ok) return []
    const data = await res.json() as any
    // Accept either { items: [...] } or [...] for flexibility
    return Array.isArray(data) ? data : ((data.items as any[]) || [])
  } catch {
    return []
  }
}

export default async function AdminOrdersPage() {
  const orders = await getOrders()
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>Recent Orders</h1>
        <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
      </div>
      {orders.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-600)" }}>No orders found or backend endpoint not available.</p>
      ) : (
        <div className="mt-6 border border-neutral-200 rounded divide-y">
{orders.map((o: any) => (
            <div key={o.id} className="p-3 text-sm flex items-center justify-between">
              <div>
                <div>Order #{o.id} · {o.status || "Unknown"}</div>
                <div className="text-xs" style={{ color: "var(--ink-600)" }}>{o.email || o.customer_email || ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs" style={{ color: "var(--ink-600)" }}>{new Date(o.created_at || o.createdAt || Date.now()).toLocaleString()}</div>
                <Link href={`/admin/orders/${o.id}`} className="underline text-xs">View</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

