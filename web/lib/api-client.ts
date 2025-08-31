/**
 * API Client for MDV Application
 * 
 * Handles authenticated API requests with automatic token management.
 * Includes JWT token from HTTP-only cookies and handles authentication errors.
 * 
 * Features:
 * - Automatic token extraction from cookies
 * - Request timeout handling (12 seconds)
 * - Proper error response handling
 * - TypeScript generic support for response types
 * 
 * Authentication Error Handling:
 * - 401 errors should be caught by calling components
 * - Components should redirect to appropriate login page
 * - Staff endpoints redirect to /staff-login
 * - Customer endpoints redirect to /customer-login
 * 
 * @param path - API endpoint path (e.g., '/api/admin/products')
 * @param init - Fetch options (method, body, etc.)
 * @returns Promise resolving to typed response data
 * 
 * @example
 * try {
 *   const products = await api<Product[]>('/api/admin/products')
 * } catch (error) {
 *   if (error.message.includes('401')) {
 *     // Handle authentication error
 *     window.location.href = '/staff-login'
 *   }
 * }
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  const ctrl = new AbortController()
  // Longer timeout for admin operations (product creation, etc.)
  const isAdminPath = path.startsWith('/api/admin')
  const timeout = isAdminPath ? 35000 : 12000 // 35s for admin, 12s for others
  const id = setTimeout(() => ctrl.abort(), timeout)
  
  // Build headers (avoid setting Content-Type for FormData bodies)
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const headers: HeadersInit = {
    ...(init?.headers || {}),
  }
  if (!isFormData && !('Content-Type' in (headers as Record<string, string>))) {
    (headers as Record<string, string>)["Content-Type"] = "application/json"
  }
  
  // Route admin requests through Next.js proxy (uses HttpOnly cookie on server)
  const url = isAdminPath ? path : `${base}${path}`
  
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(text || `Request failed: ${res.status}`)
    }
    // If no content
    if (res.status === 204) return undefined as unknown as T
    return res.json() as Promise<T>
  } finally {
    clearTimeout(id)
  }
}

