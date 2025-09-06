import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('mdv_token')?.value
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // Get query parameters from the request URL
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    // Build the backend URL with query parameters
    const url = `${backendUrl}/api/categories${queryString ? `?${queryString}` : ''}`
    
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    // Add authorization header if token exists (for authenticated requests)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      console.error(`Backend responded with ${response.status}: ${response.statusText}`)
      
      // Return empty array on error
      return NextResponse.json([])
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Categories API error:', error)
    
    // Return empty array on error
    return NextResponse.json([])
  }
}
