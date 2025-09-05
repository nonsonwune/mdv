import { NextRequest, NextResponse } from "next/server"
import { API_BASE_INTERNAL } from "../../../../lib/api"
import type { AuthLoginResponse } from "../../../../lib/types"

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)

  try {
    const body = await req.json()

    // Log login attempt (without password)
    console.log(`[AUTH-${requestId}] Login attempt for email: ${body.email}`)

    const resp = await fetch(`${API_BASE_INTERNAL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId
      },
      body: JSON.stringify(body),
    })

    const responseTime = Date.now() - startTime
    console.log(`[AUTH-${requestId}] Backend response: ${resp.status} (${responseTime}ms)`)

    if (!resp.ok) {
      const text = await resp.text()
      console.error(`[AUTH-${requestId}] Login failed: ${resp.status} - ${text}`)
      return new NextResponse(text || "Login failed", { status: resp.status })
    }

    const data = (await resp.json()) as AuthLoginResponse
    const token = data.token || data.access_token
    const role = data.role || "customer"

    // Handle force password change scenario
    if (data.force_password_change) {
      return NextResponse.json({
        force_password_change: true,
        user_id: data.user_id,
        message: data.message || "Password change required before accessing the system",
        role: role
      }, { status: 200 })
    }

    if (!token) {
      console.error(`[AUTH-${requestId}] Missing token in auth response:`, data)
      return NextResponse.json({ error: "Missing token from auth response" }, { status: 500 })
    }

    // CRITICAL FIX: Return complete user data that frontend expects
    // This resolves the authentication race condition by providing immediate user context
    const res = NextResponse.json({
      ok: true,
      token: token,
      user: data.user,
      role: role
    })
    const prod = process.env.NODE_ENV === "production"

    // Enhanced cookie settings for Railway deployment and better persistence
    const cookieOptions = {
      httpOnly: true,
      secure: prod,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      // Remove domain restriction for Railway - let browser handle same-origin
      domain: undefined
    }

    res.cookies.set("mdv_token", token, cookieOptions)
    res.cookies.set("mdv_role", role, cookieOptions)

    console.log(`[AUTH-${requestId}] Login successful for ${body.email}, role: ${role}`)
    return res
  } catch (e) {
    console.error(`[AUTH-${requestId}] Login error:`, e)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
