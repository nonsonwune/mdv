"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "../../lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ShippingEstimateResponse, CheckoutInitResponse } from "../../lib/api-types";
import { formatNaira } from "../../lib/format";
import CheckoutSkeleton from "../_components/CheckoutSkeleton";
import CheckoutSteps from "../_components/CheckoutSteps";
import { useToast } from "../_components/ToastProvider";

async function ensureCartId(): Promise<number> {
  const raw = localStorage.getItem("mdv_cart_id");
  if (raw) return Number(raw);
  const res = await fetch(`${API_BASE}/api/cart`, { method: "POST" });
  const data = await res.json();
  localStorage.setItem("mdv_cart_id", String(data.id));
  return data.id;
}

export default function CheckoutPage() {
  const [form, setForm] = useState({ name: "", phone: "", state: "Lagos", city: "", street: "", email: "", coupon: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{
    id: number;
    items: { id: number; variant_id: number; qty: number; price?: number }[];
  } | null>(null);
  const [estimate, setEstimate] = useState<ShippingEstimateResponse | null>(null);
  const [estimating, setEstimating] = useState(false);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const cart_id = await ensureCartId();
      try {
        const res = await fetch(`${API_BASE}/api/cart/${cart_id}`, { cache: "no-store" });
        if (res.ok) {
          setCart(await res.json());
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!form.state) return;
      setEstimating(true);
      try {
        const params = new URLSearchParams({ state: form.state });
        // Include subtotal if available from cart items (when backend returns item.price)
        const subtotal = cart ? cart.items.reduce((n, it) => n + (Number(it.price || 0) * Number(it.qty || 0)), 0) : 0
        if (subtotal > 0) params.set("subtotal", String(subtotal))
        if (form.coupon) params.set("coupon_code", form.coupon);
        const resp = await fetch(`${API_BASE}/api/shipping/calculate?${params.toString()}`);
        if (resp.ok) {
          const data = (await resp.json()) as ShippingEstimateResponse;
          setEstimate(data);
        } else {
          setEstimate(null);
        }
      } catch (e) {
        setEstimate(null);
      } finally {
        setEstimating(false);
      }
    })();
  }, [form.state, form.coupon, cart]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Check if cart is empty before proceeding
      if (!cart || cart.items.length === 0) {
        toast.error("Cart is empty", "Please add items to your cart before checkout");
        setError("Your cart is empty. Please add some items before proceeding to checkout.");
        setLoading(false);
        return;
      }
      
      const cart_id = await ensureCartId();
      const res = await fetch(`${API_BASE}/api/checkout/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_id,
          address: { name: form.name, phone: form.phone, state: form.state, city: form.city, street: form.street },
          email: form.email,
          coupon_code: form.coupon || null,
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        // Handle specific error cases
        if (errorText.includes('Cart is empty')) {
          toast.error("Cart is empty", "Please add items to your cart before checkout");
          setError("Your cart appears to be empty. Please refresh the page and add items to your cart.");
          return;
        }
        throw new Error(errorText);
      }
      
      const data = await res.json() as CheckoutInitResponse;
      const useMock = process.env.NEXT_PUBLIC_ALLOW_MOCKS === 'true'
      
      if (useMock && (data as any).order_id && (data as any).reference) {
        toast.info("Opening Paystack mock...")
        router.push(`/paystack-mock?order_id=${(data as any).order_id}&ref=${encodeURIComponent((data as any).reference)}`)
      } else if (data.authorization_url) {
        toast.info("Redirecting to Paystack...")
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      let msg = "Failed to start checkout. Please try again.";
      
      // Parse error messages for better user experience
      if (err?.message) {
        if (err.message.includes('Cart is empty')) {
          msg = "Your cart is empty. Please add some items before checking out.";
        } else if (err.message.includes('Invalid')) {
          msg = "Please check your information and try again.";
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          msg = "Connection error. Please check your internet and try again.";
        } else {
          msg = err.message;
        }
      }
      
      setError(msg);
      toast.error("Checkout failed", msg);
    } finally {
      setLoading(false);
    }
  }

  const loadingCart = !cart

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/cart" className="text-sm underline">← Back to cart</Link>
      <div className="flex items-center justify-between mt-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>Checkout</h1>
        <CheckoutSteps current={1} />
      </div>

      {!cart ? null : (
      <div className="mt-4 border border-neutral-200 rounded p-4">
        <h2 className="font-medium">Order Summary</h2>
        {cart ? (
          cart.items.length ? (
            <ul className="mt-2 text-sm space-y-2">
              {cart.items.map((it) => {
                const line = (Number(it.price || 0) * Number(it.qty || 0))
                return (
                  <li key={it.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Show thumbnail if backend enriches item.image_url */}
                      {Boolean((it as any).image_url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(it as any).image_url as string} alt={String(it.variant_id)} className="w-10 h-10 rounded object-cover bg-neutral-100" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-neutral-100" />)
                      }
                      <span>Variant #{it.variant_id} × {it.qty}</span>
                    </div>
                    {typeof it.price === "number" ? (
                      <span>{formatNaira(line)}</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm mt-2">Your cart is empty.</p>
          )
        ) : (
          <p className="text-sm mt-2">Loading cart…</p>
        )}
        <div className="text-sm mt-3" style={{ color: "var(--ink-600)" }}>
          Subtotal: {cart && cart.items.some((it) => typeof it.price === "number")
            ? formatNaira(cart.items.reduce((n, it) => n + (Number(it.price || 0) * Number(it.qty || 0)), 0))
            : <span className="italic">Unavailable</span>}
        </div>
        <div className="text-sm mt-1">
          Shipping estimate: {estimating ? "Calculating…" : estimate && estimate.shipping_fee !== undefined ? `${formatNaira(estimate.shipping_fee)}${estimate.free_shipping_eligible ? " (free eligible)" : ""}` : "Not available"}
        </div>
        <div className="text-sm mt-1 font-medium">
          Estimated total: {cart && cart.items.some((it) => typeof it.price === 'number')
            ? formatNaira(cart.items.reduce((n, it) => n + (Number(it.price || 0) * Number(it.qty || 0)), 0) + (estimate?.shipping_fee || 0))
            : <span className="italic">Unavailable</span>}
        </div>
        <div className="text-xs mt-2" style={{ color: "var(--ink-600)" }}>
          Note: Coupons are validated during payment; estimates may change at checkout.
        </div>
      </div>)}

      {!cart ? (
        <CheckoutSkeleton />
      ) : (
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border p-2 rounded" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className="border p-2 rounded" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border p-2 rounded" placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required />
          <input className="border p-2 rounded" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
        </div>
        <input className="border p-2 rounded w-full" placeholder="Street address" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} required />
        <input className="border p-2 rounded w-full" placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input className="border p-2 rounded w-full" placeholder="Coupon (optional)" value={form.coupon} onChange={e => setForm({ ...form, coupon: e.target.value })} />
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        <button 
          className={`btn-primary ${
            (!cart || cart.items.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={loading || !cart || cart.items.length === 0}
          type="submit"
        >
          {loading ? "Processing…" : (!cart || cart.items.length === 0) ? "Cart is Empty" : "Pay with Paystack"}
        </button>
      </form>
      )}
    </div>
  );
}

