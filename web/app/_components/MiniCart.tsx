"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { API_BASE } from "../../lib/api"
import { useToast } from "./ToastProvider"
import { fetchCart as fetchCartApi, getStoredCartId, clearStoredCartId } from "../../lib/cart"

type CartData = { id: number; items: { id: number; variant_id: number; qty: number; price?: number; image_url?: string; title?: string }[] }

export default function MiniCart({ onClose }: { onClose: () => void }) {
  const [cart, setCart] = useState<CartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null)
  const toast = useToast()

  const fetchCart = useCallback(async (id: number) => {
    try {
      const data = await fetchCartApi(id)
      setCart(data)
    } catch (e: any) {
      if (e && e.code === 404) {
        clearStoredCartId()
        setCart({ id: 0, items: [] })
        return
      }
      throw e
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    (async () => {
      const id = getStoredCartId()
      if (!id) { setCart({ id: 0, items: [] }); setLoading(false); return }
      try { await fetchCart(id) } catch { /* ignore */ } finally { setLoading(false) }
    })()
  }, [fetchCart])

  async function changeQty(itemId: number, qty: number) {
    if (!cart || !cart.id) return;
    const cartId = cart.id;
    setUpdatingItemId(itemId);
    try {
      if (qty <= 0) {
        const res = await fetch(`${API_BASE}/api/cart/${cartId}/items/${itemId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch(`${API_BASE}/api/cart/${cartId}/items/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qty }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      await fetchCart(cartId);
    } catch (e) {
      toast.error("Cart update failed", "Cart endpoints may be unavailable yet.")
      console.error(e);
    } finally {
      setUpdatingItemId(null);
    }
  }

  function subtotal(): number {
    if (!cart) return 0
    return cart.items.reduce((n, it) => n + (Number(it.price || 0) * Number(it.qty || 0)), 0)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 max-w-[90vw] bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">Your Cart</div>
          <button onClick={onClose} className="text-sm underline">Close</button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <p>Loading…</p>
          ) : !cart || cart.items.length === 0 ? (
            <p className="text-sm">Your cart is empty.</p>
          ) : (
            cart.items.map((it) => (
              <div key={it.id} className="border border-neutral-200 rounded p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {it.image_url ? (
                    <Image src={it.image_url} alt={it.title || `Variant ${it.variant_id}`} width={64} height={64} className="w-16 h-16 object-cover rounded bg-neutral-100" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-neutral-100" />
                  )}
                  <div className="text-sm">
                    <div>{it.title || `Variant #${it.variant_id}`}</div>
                    {typeof it.price === "number" ? (
                      <div className="text-xs" style={{ color: "var(--ink-600)" }}>Unit: ₦{Number(it.price).toLocaleString()}</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {typeof it.price === "number" ? (
                    <div className="text-sm">₦{Number(it.price * it.qty).toLocaleString()}</div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <button className="border rounded px-2 py-1" onClick={() => changeQty(it.id, it.qty - 1)} disabled={updatingItemId === it.id}>−</button>
                    <div className="text-sm">{it.qty}</div>
                    <button className="border rounded px-2 py-1" onClick={() => changeQty(it.id, it.qty + 1)} disabled={updatingItemId === it.id}>＋</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span>{subtotal() > 0 ? `₦${subtotal().toLocaleString()}` : <span className="italic">Unavailable</span>}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Link href="/cart" className="border rounded px-4 py-2 text-sm text-center flex-1" onClick={onClose}>View cart</Link>
            <Link href="/checkout" className="btn-primary text-sm flex-1 text-center" onClick={onClose}>Checkout</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

