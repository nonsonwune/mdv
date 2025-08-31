import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { API_BASE } from '../../../../lib/api'

async function proxy(request: NextRequest, context: { params: { path?: string[] } }) {
  const token = cookies().get('mdv_token')?.value
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
  }

  const pathSegments = context.params.path || []
  const search = request.nextUrl.search
  // Support both standard /api/admin/* routes and special admin routers without /api prefix
  const first = pathSegments[0] || ''
  const basePath = (first === 'inventory') ? 'admin' : 'api/admin'
  const target = `${API_BASE}/${basePath}/${pathSegments.join('/')}${search}`

  const headers = new Headers(request.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.delete('cookie')
  headers.delete('host')

  // Create AbortController with longer timeout for admin operations
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
    signal: controller.signal,
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.startsWith('multipart/form-data')) {
      // Rebuild FormData and let undici set the boundary automatically
      const formData = await request.formData()
      // Remove potentially conflicting headers so undici can set correct values
      headers.delete('content-type')
      headers.delete('content-length')
      headers.delete('transfer-encoding')
      headers.delete('content-encoding')
      init.body = formData as any
    } else {
      const body = await request.text()
      init.body = body
    }
  }

  try {
    const resp = await fetch(target, init)
    clearTimeout(timeoutId)

    // Stream or JSON passthrough
    const resHeaders = new Headers(resp.headers)
    // Ensure CORS is fine for same-origin proxy
    resHeaders.delete('access-control-allow-origin')
    resHeaders.delete('access-control-allow-credentials')

    const contentType = resp.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await resp.text()
      return new NextResponse(data, { status: resp.status, headers: resHeaders })
    }

    const blob = await resp.arrayBuffer()
    return new NextResponse(blob, { status: resp.status, headers: resHeaders })
  } catch (error) {
    clearTimeout(timeoutId)

    // Handle timeout or other errors
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { detail: 'Request timeout - operation took too long' },
        { status: 408 }
      )
    }

    // Re-throw other errors
    throw error
  }


}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
export const PATCH = proxy
export const OPTIONS = proxy


