import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest, { params }: { params: { cart_id: string } }) {
  try {
    const token = cookies().get('mdv_token')?.value
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // Get request body
    const body = await request.text()
    
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    // Add authorization header if token exists (for authenticated requests)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(`${backendUrl}/api/cart/${params.cart_id}/items`, {
      method: 'POST',
      headers,
      body: body
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cart add item error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to add item to cart' }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Cart add item proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
