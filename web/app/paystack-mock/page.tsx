"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function PaystackMockPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const orderId = Number(sp.get("order_id"));
  const ref = sp.get("ref") || "";
  const allowMocks = process.env.NEXT_PUBLIC_ALLOW_MOCKS === "true" || process.env.NODE_ENV === "development";

  async function send(kind: "success" | "fail") {
    try {
      const event = kind === "success" ? "charge.success" : "charge.failed";
      const body = { event, data: { reference: ref, amount: 1000 } };
      const resp = await fetch("/api/paystack/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(await resp.text());
      // Redirect to callback like Paystack would
      router.push(`/checkout/callback?order_id=${orderId}&ref=${encodeURIComponent(ref)}`);
    } catch (e) {
      alert("Mock failed: check console");
      console.error(e);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>Paystack Mock</h1>
      {!allowMocks ? (
        <p className="mt-4">Mocks are disabled in this environment.</p>
      ) : (!ref || !Number.isFinite(orderId)) ? (
        <p className="mt-4">Missing order/ref.</p>
      ) : (
        <>
          <p className="mt-4">Order #{orderId}</p>
          <p className="text-sm break-all">Ref: {ref}</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button className="btn-primary" onClick={() => send("success")}>Simulate Success</button>
            <button className="border px-4 py-2 rounded" onClick={() => send("fail")}>Simulate Failure</button>
          </div>
          <p className="mt-6 text-xs" style={{ color: "var(--ink-600)" }}>
            This page is for local/CI testing only. It is gated by NEXT_PUBLIC_ALLOW_MOCKS or NODE_ENV=development.
          </p>
        </>
      )}
    </div>
  );
}

