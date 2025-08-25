"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "../../../lib/api";
import { clearStoredCartId } from "../../../lib/cart";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CheckoutCallbackPage() {
  const [status, setStatus] = useState<string>("PendingPayment");
  const [message, setMessage] = useState<string>("Confirming payment…");

  const sp = useSearchParams();

  useEffect(() => {
    const orderId = Number(sp.get("order_id"));
    if (!Number.isFinite(orderId)) {
      setMessage("Missing order id");
      return;
    }
    let tries = 0;
    const iv = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/tracking`, { cache: "no-store" });
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "Paid") {
          setMessage("Payment confirmed. Thank you!");
          clearStoredCartId(); // Clear the cart ID from localStorage
          clearInterval(iv);
        } else if (tries > 30) {
          setMessage("Still pending. Please wait or contact support if this persists.");
          clearInterval(iv);
        }
      } catch (e) {
        // ignore transient errors
      }
    }, 1500);
    return () => clearInterval(iv);
  }, [sp]);

  async function retryNow() {
    const orderId = Number(sp.get("order_id"));
    if (!Number.isFinite(orderId)) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/tracking`, { cache: "no-store" });
      const data = await res.json();
      setStatus(data.status);
      setMessage(data.status === "Paid" ? "Payment confirmed. Thank you!" : "Still pending. Please wait.");
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>Checkout Status</h1>
      <p className="mt-4">{message}</p>
      <p className="mt-2 text-sm">Status: {status}</p>
      <div className="mt-6 flex items-center justify-center gap-4">
        <button className="border rounded px-3 py-2 text-sm" onClick={retryNow}>Retry now</button>
        <a href="https://wa.me/+2348136514087" target="_blank" className="underline text-sm">Contact support</a>
      </div>
      <Link href="/" className="inline-block mt-8 underline">Go back home</Link>
    </div>
  );
}

