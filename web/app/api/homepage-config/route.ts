import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('mdv_token')?.value
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    // Add authorization header if token exists (for authenticated requests)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(`${backendUrl}/api/homepage-config`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      console.error(`Backend responded with ${response.status}: ${response.statusText}`)
      
      // Return default config on error
      return NextResponse.json({
        hero_title: "Maison De Valeur",
        hero_subtitle: "Discover affordable essentials and last-season fashion pieces. Quality style that doesn't break the bank, exclusively for Nigeria.",
        hero_cta_text: "Shop Now",
        hero_image_url: null,
        featured_product_ids: [],
        categories_enabled: true
      })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Homepage config API error:', error)
    
    // Return default config on error
    return NextResponse.json({
      hero_title: "Maison De Valeur",
      hero_subtitle: "Discover affordable essentials and last-season fashion pieces. Quality style that doesn't break the bank, exclusively for Nigeria.",
      hero_cta_text: "Shop Now",
      hero_image_url: null,
      featured_product_ids: [],
      categories_enabled: true
    })
  }
}
