import { NextRequest, NextResponse } from "next/server"
import { API_BASE } from "../../../../lib/api"
import type { AuthLoginResponse } from "../../../../lib/types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const text = await resp.text()
      return new NextResponse(text || "Login failed", { status: resp.status })
    }

    const data = (await resp.json()) as AuthLoginResponse
    const token = data.token || data.access_token
    const role = data.role || "customer"

    if (!token) {
      return NextResponse.json({ error: "Missing token from auth response" }, { status: 500 })
    }
    const res = NextResponse.json({ ok: true })
    const prod = process.env.NODE_ENV === "production"

    // Set cookies with more permissive settings for Railway deployment
    const cookieOptions = {
      httpOnly: true,
      secure: prod,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      // Remove domain restriction for Railway - let browser handle same-origin
      domain: undefined
    }

    res.cookies.set("mdv_token", token, cookieOptions)
    res.cookies.set("mdv_role", role, cookieOptions)

    return res
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
