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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
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
    <>
      {/* Invisible backdrop for click-outside detection */}
      <div className="fixed inset-0" style={{ zIndex: 'var(--z-popover)' }} onClick={onClose} />

      {/* Dropdown positioned relative to cart button */}
      <div
        className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-white border border-neutral-200 rounded-lg shadow-lg max-h-96 flex flex-col"
        style={{ zIndex: 'var(--z-dropdown)' }}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">Your Cart</div>
          <button onClick={onClose} className="text-sm text-neutral-500 hover:text-neutral-700">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-neutral-500">Loading…</p>
            </div>
          ) : !cart || cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-sm text-neutral-500">Your cart is empty</p>
            </div>
          ) : (
            cart.items.map((it) => (
              <div key={it.id} className="border border-neutral-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-3">
                  {it.image_url ? (
                    <Image
                      src={it.image_url}
                      alt={it.title || `Variant ${it.variant_id}`}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded bg-neutral-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-neutral-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{it.title || `Variant #${it.variant_id}`}</div>
                    {typeof it.price === "number" ? (
                      <div className="text-xs text-neutral-500">₦{Number(it.price).toLocaleString()} each</div>
                    ) : null}
                  </div>
                  {typeof it.price === "number" ? (
                    <div className="text-sm font-medium">₦{Number(it.price * it.qty).toLocaleString()}</div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      className="w-8 h-8 border border-neutral-300 rounded hover:bg-neutral-50 flex items-center justify-center text-sm"
                      onClick={() => changeQty(it.id, it.qty - 1)}
                      disabled={updatingItemId === it.id}
                    >
                      −
                    </button>
                    <span className="text-sm font-medium w-8 text-center">{it.qty}</span>
                    <button
                      className="w-8 h-8 border border-neutral-300 rounded hover:bg-neutral-50 flex items-center justify-center text-sm"
                      onClick={() => changeQty(it.id, it.qty + 1)}
                      disabled={updatingItemId === it.id}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="text-xs text-neutral-500 hover:text-red-600 underline"
                    onClick={() => changeQty(it.id, 0)}
                    disabled={updatingItemId === it.id}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="p-4 border-t bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Subtotal</span>
              <span className="font-medium">
                {subtotal() > 0 ? `₦${subtotal().toLocaleString()}` : <span className="italic text-neutral-500">Unavailable</span>}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                className="border border-neutral-300 rounded-lg px-4 py-2 text-sm text-center hover:bg-neutral-50 transition-colors"
                onClick={onClose}
              >
                View Cart
              </Link>
              <Link
                href="/checkout"
                className="bg-maroon-700 text-white rounded-lg px-4 py-2 text-sm text-center hover:bg-maroon-800 transition-colors"
                onClick={onClose}
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

