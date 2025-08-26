import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { width: string; height: string } }
) {
  const { width, height } = params
  
  // Validate dimensions
  const w = parseInt(width, 10)
  const h = parseInt(height, 10)
  
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0 || w > 2000 || h > 2000) {
    return new NextResponse('Invalid dimensions', { status: 400 })
  }

  // Create SVG placeholder
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#f3f4f6"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="sans-serif" font-size="${Math.min(w, h) / 8}" fill="#9ca3af">
        ${w} × ${h}
      </text>
    </svg>
  `.trim()

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
