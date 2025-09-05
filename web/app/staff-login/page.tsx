"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "../../lib/auth-context"
import { LoadingButton } from "../../components/ui/loading-spinner"
import { useToast } from "../_components/ToastProvider"
import {
  LoginError,
  ValidationErrors,
  validateLoginForm,
  parseApiError,
  parseUrlError,
  getErrorSuggestions,
  shouldRateLimit,
  createRateLimitError,
  createNetworkError,
  isRetryableAfterTime
} from "../../lib/login-error-handler"

export default function StaffLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<LoginError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastAttemptTime, setLastAttemptTime] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const { checkAuth, login } = useAuth()
  const toast = useToast()

  // Enhanced URL error parameter handling
  useEffect(() => {
    const urlError = searchParams.get('error')
    const parsedError = parseUrlError(urlError)
    if (parsedError) {
      // Add specific context for staff login
      if (urlError === 'insufficient_permissions') {
        setError({
          ...parsedError,
          message: 'Access denied. Please use staff credentials.',
          details: 'Your account does not have the required permissions to access the admin dashboard.'
        })
      } else {
        setError(parsedError)
      }
    }
  }, [searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Clear previous errors
    setError(null)
    setValidationErrors({})

    // Validate form
    const errors = validateLoginForm(email, password)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    // Check rate limiting
    if (shouldRateLimit(lastAttemptTime)) {
      setError(createRateLimitError())
      return
    }

    setLoading(true)
    setLastAttemptTime(Date.now())

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": `login-${Date.now()}-${Math.random().toString(36).substring(7)}`
        },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!res.ok) {
        const loginError = await parseApiError(res)
        setError(loginError)
        setRetryCount(prev => prev + 1)

        // Track failed attempts for additional security
        if (retryCount >= 2) {
          setError({
            ...loginError,
            message: 'Multiple failed attempts detected',
            details: 'Please double-check your credentials or contact support if you continue having issues.'
          })
        }
        return
      }

      const data = await res.json()

      // Handle force password change scenario
      if (data.force_password_change) {
        const changePasswordUrl = `/change-password?user_id=${data.user_id}&message=${encodeURIComponent(data.message || 'Password change required')}`
        router.replace(changePasswordUrl as any)
        return
      }

      // Reset retry count on successful login
      setRetryCount(0)

      // Show success toast
      toast.success("Welcome back!", data.user?.name ? `Hello ${data.user.name}, you're now signed in.` : "You have successfully signed in.")

      // CRITICAL FIX: Login endpoint now returns complete user data
      // Update auth context immediately with the user data from login response
      if (data.user && data.token) {
        login(data.token, data.user)
        console.log('[Login] Auth context updated with user:', data.user.email, 'role:', data.user.role)

        // Check if user has staff permissions before redirecting
        const staffRoles = ['admin', 'supervisor', 'operations', 'logistics']
        if (!staffRoles.includes(data.user.role)) {
          console.error('[Login] User does not have staff permissions:', data.user.role)
          setError({
            type: 'permission',
            message: 'Access denied. Your account does not have staff permissions.',
            retryable: false
          })
          return
        }
      } else {
        console.error('[Login] Missing user data in login response:', data)
        setError({
          type: 'server',
          message: 'Login succeeded but user data is incomplete. Please try again.',
          retryable: true
        })
        return
      }

      // Simple extended delay to ensure auth context is fully loaded
      // This gives time for cookies to be set and auth context to initialize
      console.log('[Login] Waiting for auth context to fully load...')
      await new Promise(resolve => setTimeout(resolve, 5000))

      // For staff, redirect to admin dashboard by default
      const next = searchParams.get("next") || "/admin"

      console.log('[Login] User has valid staff role, navigating to admin dashboard:', next)

      // Try router.push with additional delay to ensure cookies are properly set
      router.push(next as any)

    } catch (networkError) {
      // Handle network errors
      setError(createNetworkError())
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-50 to-neutral-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-maroon-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Portal</h1>
          <p className="text-gray-600">Sign in to access admin dashboard</p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Staff Email
            </label>
            <input
              id="email"
              data-testid="email-input"
              type="email"
              autoComplete="email"
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 ${
                validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter your staff email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (validationErrors.email) {
                  setValidationErrors(prev => ({ ...prev, email: undefined }))
                }
              }}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600" data-testid="email-error">
                {validationErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              data-testid="password-input"
              type="password"
              autoComplete="current-password"
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 ${
                validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (validationErrors.password) {
                  setValidationErrors(prev => ({ ...prev, password: undefined }))
                }
              }}
            />
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-600" data-testid="password-error">
                {validationErrors.password}
              </p>
            )}
          </div>

          {error && (
            <div className={`border rounded-md p-4 ${
              error.type === 'rate_limit' ? 'bg-yellow-50 border-yellow-200' :
              error.type === 'network' ? 'bg-blue-50 border-blue-200' :
              error.type === 'server' ? 'bg-purple-50 border-purple-200' :
              'bg-red-50 border-red-200'
            }`} data-testid="error-message">
              <div className="flex">
                <svg className={`w-5 h-5 flex-shrink-0 ${
                  error.type === 'rate_limit' ? 'text-yellow-400' :
                  error.type === 'network' ? 'text-blue-400' :
                  error.type === 'server' ? 'text-purple-400' :
                  'text-red-400'
                }`} fill="currentColor" viewBox="0 0 20 20">
                  {error.type === 'rate_limit' ? (
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  ) : error.type === 'network' ? (
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  )}
                </svg>
                <div className="ml-3 flex-1">
                  <h3 className={`text-sm font-medium ${
                    error.type === 'rate_limit' ? 'text-yellow-800' :
                    error.type === 'network' ? 'text-blue-800' :
                    error.type === 'server' ? 'text-purple-800' :
                    'text-red-800'
                  }`}>
                    {error.message}
                  </h3>
                  {error.details && (
                    <p className={`mt-1 text-sm ${
                      error.type === 'rate_limit' ? 'text-yellow-700' :
                      error.type === 'network' ? 'text-blue-700' :
                      error.type === 'server' ? 'text-purple-700' :
                      'text-red-700'
                    }`}>
                      {error.details}
                    </p>
                  )}
                  {error.retryAfter && (
                    <p className="mt-2 text-xs text-gray-600">
                      Please wait {error.retryAfter} seconds before trying again.
                    </p>
                  )}
                  {error.retryable && retryCount >= 2 && (
                    <div className="mt-3 text-xs text-gray-600">
                      <p>Still having trouble? Try:</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {getErrorSuggestions(error, retryCount).map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <LoadingButton
              type="submit"
              data-testid="login-button"
              loading={loading}
              loadingText="Signing in..."
              disabled={error && !isRetryableAfterTime(error, lastAttemptTime)}
              className="w-full"
              style={{ backgroundColor: '#800000', color: '#ffffff' }}
            >
              Staff Sign In
            </LoadingButton>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-2">
                <p className="text-sm text-yellow-700">
                  <strong>Staff Access Only</strong>
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  This portal is for MDV staff members only. For customer access, please use the main store.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 text-center">
            <Link 
              href="/" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to store
            </Link>
          </div>
        </div>

        {/* Customer login link */}
        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-gray-500 mb-2">Customer?</p>
          <Link 
            href="/customer-login" 
            className="text-xs text-maroon-600 hover:text-maroon-500 transition-colors"
          >
            Customer Sign In →
          </Link>
        </div>
      </div>
    </div>
  )
}
