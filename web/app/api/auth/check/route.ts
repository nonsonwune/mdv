import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("mdv_token")
    const role = cookieStore.get("mdv_role")
    
    if (!token) {
      return NextResponse.json(
        { authenticated: false, message: "No token found" },
        { status: 401 }
      )
    }
    
    // In a production app, you would verify the token here
    // For now, we just check if it exists
    return NextResponse.json({
      authenticated: true,
      role: role?.value || "customer"
    })
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, message: "Authentication check failed" },
      { status: 500 }
    )
  }
}
