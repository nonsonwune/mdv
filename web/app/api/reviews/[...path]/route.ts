import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_INTERNAL } from '@/lib/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'DELETE')
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const pathSegments = params.path || []
    const search = request.nextUrl.search
    const target = `${API_BASE_INTERNAL}/api/reviews/${pathSegments.join('/')}${search}`

    // Get headers from the original request
    const headers: Record<string, string> = {}
    
    // Copy important headers
    const headersToForward = [
      'authorization',
      'content-type',
      'accept',
      'user-agent',
    ]
    
    headersToForward.forEach(header => {
      const value = request.headers.get(header)
      if (value) {
        headers[header] = value
      }
    })

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
    }

    // Add body for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      try {
        const body = await request.text()
        if (body) {
          requestOptions.body = body
        }
      } catch (error) {
        console.error('Error reading request body:', error)
      }
    }

    // Make the request to the backend
    const response = await fetch(target, requestOptions)
    
    // Get response data
    const data = await response.text()
    
    // Create response with same status and headers
    const nextResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy relevant response headers
    const responseHeadersToForward = [
      'content-type',
      'cache-control',
      'etag',
      'last-modified',
    ]
    
    responseHeadersToForward.forEach(header => {
      const value = response.headers.get(header)
      if (value) {
        nextResponse.headers.set(header, value)
      }
    })

    return nextResponse

  } catch (error) {
    console.error('Reviews proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
