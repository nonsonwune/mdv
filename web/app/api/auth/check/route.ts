import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('mdv_token')?.value
    const role = cookies().get('mdv_role')?.value
    
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Call the backend to get user profile
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${backendUrl}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // Token might be expired or invalid, but don't clear cookies immediately
        // Allow for potential token refresh or fallback
        return NextResponse.json({ authenticated: false }, { status: 401 })
      }

      const userData = await response.json()
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: userData.id.toString(),
          name: userData.name,
          email: userData.email,
          role: userData.role || role, // Fallback to cookie role
          active: userData.active,
          created_at: userData.created_at,
          phone: userData.phone
        }
      })
    } catch (fetchError) {
      // Backend might be down, but token exists - return basic info from cookies
      return NextResponse.json({
        authenticated: true,
        user: {
          id: 'unknown',
          name: 'User',
          email: 'unknown@mdv.ng',
          role: role || 'customer',
          active: true,
          created_at: new Date().toISOString()
        }
      })
    }

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    )
  }
}
