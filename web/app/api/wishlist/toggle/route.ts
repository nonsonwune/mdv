import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const token = cookies().get('mdv_token')?.value

    console.log('Wishlist toggle: token exists?', !!token)
    console.log('Wishlist toggle: token length', token?.length)

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    console.log('Wishlist toggle: backend URL', backendUrl)
    
    // Get request body
    const body = await request.text()
    
    console.log('Wishlist toggle: making request to', `${backendUrl}/api/wishlist/toggle`)
    console.log('Wishlist toggle: request body', body)

    const response = await fetch(`${backendUrl}/api/wishlist/toggle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body
    })

    console.log('Wishlist toggle: response status', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Wishlist toggle error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to toggle wishlist item', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Wishlist toggle API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
