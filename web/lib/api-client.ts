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
  const id = setTimeout(() => ctrl.abort(), 12000)
  
  // Build headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers || {}),
  }
  
  // Route admin requests through Next.js proxy (uses HttpOnly cookie on server)
  const isAdminPath = path.startsWith('/api/admin')
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

