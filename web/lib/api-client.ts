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
 * - Circuit breaker pattern for resilience
 * - Automatic retry with exponential backoff
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

import { apiCircuitBreaker } from './circuit-breaker'
// Retry utility with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Don't retry on client errors (4xx) or success
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response
      }

      // Retry on server errors (5xx) with exponential backoff
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000) // Max 5 second delay
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error as Error

      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        throw lastError
      }

      // Retry with exponential backoff for network/timeout errors
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  // Longer timeout for admin operations (product creation, etc.)
  const isAdminPath = path.startsWith('/api/admin')
  const timeout = isAdminPath ? 35000 : 12000 // 35s for admin, 12s for others

  // Build headers (avoid setting Content-Type for FormData bodies)
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const headers: HeadersInit = {
    ...(init?.headers || {}),
  }
  if (!isFormData && !('Content-Type' in (headers as Record<string, string>))) {
    (headers as Record<string, string>)["Content-Type"] = "application/json"
  }

  // Route all API requests through Next.js proxy (uses HttpOnly cookie on server)
  // This ensures authentication cookies are available for all API calls
  const isApiPath = path.startsWith('/api/')
  const url = isApiPath ? path : `${base}${path}`

  // Use circuit breaker for resilience
  return apiCircuitBreaker.execute(async () => {
    const ctrl = new AbortController()
    const id = setTimeout(() => ctrl.abort(), timeout)

    try {
      const res = await fetchWithRetry(url, {
        ...init,
        signal: ctrl.signal,
        headers,
      }, 3) // Retry up to 3 times

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
  })
}

