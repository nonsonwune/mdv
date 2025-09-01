import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_BASE_INTERNAL } from "../../../../lib/api"

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("mdv_token")
    
    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }
    
    // Forward the request to the backend with the auth token
    const response = await fetch(`${API_BASE_INTERNAL}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const text = await response.text()
      return new NextResponse(text || "Failed to fetch profile", { 
        status: response.status 
      })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Profile proxy error:', error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("mdv_token")
    
    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }
    
    const body = await req.json()
    
    // Forward the request to the backend with the auth token
    const response = await fetch(`${API_BASE}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      const text = await response.text()
      return new NextResponse(text || "Failed to update profile", { 
        status: response.status 
      })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Profile update proxy error:', error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
