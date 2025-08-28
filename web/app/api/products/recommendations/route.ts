import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('mdv_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // For now, return empty recommendations since backend endpoint may not exist
    // TODO: Implement real product recommendations endpoint in backend
    try {
      const response = await fetch(`${backendUrl}/api/products/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({ products: data.products || [] })
      }
    } catch (error) {
      console.error('Backend recommendations error:', error)
    }
    
    // Fallback: return empty recommendations until backend endpoint is implemented
    return NextResponse.json({ products: [] })
  } catch (error) {
    console.error('Recommendations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
