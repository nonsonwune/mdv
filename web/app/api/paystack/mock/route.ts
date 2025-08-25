import type { NextRequest } from "next/server"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const SECRET = process.env.PAYSTACK_SECRET_KEY

const allowMocks = process.env.ALLOW_MOCKS === "true" || process.env.NODE_ENV === "development"

export async function POST(req: NextRequest) {
  if (!allowMocks) {
    return new Response("Not Found", { status: 404 })
  }
  if (!SECRET) {
    return new Response(JSON.stringify({ error: "PAYSTACK_SECRET_KEY not set" }), { status: 500 })
  }
  const raw = await req.arrayBuffer()
  const body = Buffer.from(raw)
  // Compute signature (HMAC-SHA512) on the server to avoid leaking secrets to the browser
  const crypto = await import("crypto")
  const h = crypto.createHmac("sha512", SECRET)
  h.update(body)
  const sig = h.digest("hex")

  const resp = await fetch(`${API}/api/paystack/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-paystack-signature": sig,
    },
    body,
  })
  const text = await resp.text()
  return new Response(text, { status: resp.status })
}

