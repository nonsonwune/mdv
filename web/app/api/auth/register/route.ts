import { NextRequest, NextResponse } from "next/server"
import { API_BASE_INTERNAL } from "../../../../lib/api"
import type { AuthLoginResponse } from "../../../../lib/types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    if (!body.name || !body.email || !body.password) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Call backend registration endpoint
    const resp = await fetch(`${API_BASE_INTERNAL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      
      // Parse error message if it's JSON
      try {
        const errorData = JSON.parse(text)
        const message = errorData.detail || errorData.message || "Registration failed"
        return new NextResponse(message, { status: resp.status })
      } catch {
        // If not JSON, return the text as is
        return new NextResponse(text || "Registration failed", { status: resp.status })
      }
    }

    // Parse successful response
    const data = (await resp.json()) as AuthLoginResponse
    const token = data.token || data.access_token
    const role = data.role || "customer"
    
    if (!token) {
      return NextResponse.json({ error: "Missing token from auth response" }, { status: 500 })
    }

    // Create response with cookies
    const res = NextResponse.json({ 
      ok: true,
      message: "Registration successful" 
    })
    
    const prod = process.env.NODE_ENV === "production"
    
    // Set authentication cookies
    res.cookies.set("mdv_token", token, { 
      httpOnly: true, 
      secure: prod, 
      sameSite: "lax", 
      path: "/",
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })
    
    res.cookies.set("mdv_role", role, { 
      httpOnly: true, 
      secure: prod, 
      sameSite: "lax", 
      path: "/",
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })
    
    return res
  } catch (e) {
    console.error("Registration error:", e)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
