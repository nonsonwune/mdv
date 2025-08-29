import { NextRequest, NextResponse } from "next/server"
import { API_BASE } from "../../../../lib/api"
import type { AuthLoginResponse } from "../../../../lib/types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Login attempt for:', body.email)

    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    console.log('Backend response status:', resp.status)

    if (!resp.ok) {
      const text = await resp.text()
      console.log('Backend error:', text)
      return new NextResponse(text || "Login failed", { status: resp.status })
    }

    const data = (await resp.json()) as AuthLoginResponse
    console.log('Backend response data:', {
      hasToken: !!(data.token || data.access_token),
      role: data.role,
      tokenType: data.token_type
    })

    const token = data.token || data.access_token
    const role = data.role || "customer"

    if (!token) {
      console.log('No token in backend response:', data)
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

    console.log('Setting cookies:', {
      tokenLength: token.length,
      role: role,
      cookieOptions: cookieOptions
    })

    res.cookies.set("mdv_token", token, cookieOptions)
    res.cookies.set("mdv_role", role, cookieOptions)

    console.log('Login successful, cookies set')
    return res
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
