import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Retry utility function with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10 second timeout per attempt
      })

      // If successful or client error (4xx), don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response
      }

      // For server errors (5xx), retry with exponential backoff
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000) // Max 5 second delay
        console.warn(`Attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error as Error

      // Don't retry on timeout or network errors on the last attempt
      if (attempt === maxRetries - 1) {
        throw lastError
      }

      // Retry with exponential backoff for network/timeout errors
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
      console.warn(`Attempt ${attempt + 1} failed with error: ${lastError.message}, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

export async function GET(request: NextRequest, { params }: { params: { category_slug: string } }) {
  try {
    const token = cookies().get('mdv_token')?.value
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    // Get query parameters from the request URL
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    // Build the backend URL with query parameters
    const url = `${backendUrl}/api/products/category/${params.category_slug}${queryString ? `?${queryString}` : ''}`

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    // Add authorization header if token exists (for authenticated requests)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers
    }, 3) // Retry up to 3 times

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Category products API error:', response.status, errorText)
      return NextResponse.json(
        {
          status: 'error',
          code: response.status,
          message: response.status === 502 ? 'Service temporarily unavailable' : 'Failed to fetch category products',
          request_id: crypto.randomUUID()
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Category products proxy error:', error)

    // Provide more specific error messages
    const isTimeout = error instanceof Error && (error.name === 'TimeoutError' || error.message.includes('timeout'))
    const isNetworkError = error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))

    return NextResponse.json(
      {
        status: 'error',
        code: 502,
        message: isTimeout ? 'Request timeout - service may be overloaded' :
                isNetworkError ? 'Network error - please try again' :
                'Internal server error',
        request_id: crypto.randomUUID()
      },
      { status: 502 }
    )
  }
}
