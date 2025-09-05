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

export default function CustomerLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<LoginError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastAttemptTime, setLastAttemptTime] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const router = useRouter()
  const searchParams = useSearchParams()
  const { checkAuth, loginWithRetry, isAuthenticated, user } = useAuth()
  const toast = useToast()

  // Enhanced redirect watcher with loading animation
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user && !loading && !isRedirecting) {
      const next = searchParams.get("next") || "/account"

      // Start redirect animation
      setIsRedirecting(true)

      // Show loading animation for 2 seconds, then redirect
      setTimeout(() => {
        window.location.href = next
      }, 2000)
    }
  }, [isAuthenticated, user, loading, searchParams, isRedirecting])



  // Enhanced URL error parameter handling
  useEffect(() => {
    const urlError = searchParams.get('error')
    const parsedError = parseUrlError(urlError)
    if (parsedError) {
      // Add specific context for customer login
      if (urlError === 'insufficient_permissions') {
        setError({
          ...parsedError,
          message: 'Access denied',
          details: 'Please use customer credentials to access your account.'
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
      // Use the auth context's loginWithRetry function
      const result = await loginWithRetry({ email: email.trim(), password })

      // Reset retry count on successful login
      setRetryCount(0)

      // Show success toast - the useEffect will handle redirect automatically
      toast.success("Welcome back!", "You have successfully signed in. Redirecting to your account...")

    } catch (loginError: any) {
      // Handle the error
      const parsedError = await parseApiError({
        ok: false,
        status: loginError.status || 401,
        text: async () => loginError.message || "Login failed"
      } as Response)

      setError(parsedError)
      setRetryCount(prev => prev + 1)

      // Track failed attempts for additional security
      if (retryCount >= 2) {
        setError({
          ...parsedError,
          message: 'Multiple failed attempts detected',
          details: 'Please double-check your credentials or contact support if you continue having issues.'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Show loading animation when redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Loading Spinner */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-maroon-200 border-t-maroon-600 rounded-full animate-spin"></div>
          </div>

          {/* Loading Text */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-gray-600 mb-4">Taking you to your account...</p>

          {/* Progress Bar */}
          <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
            <div className="bg-maroon-600 h-2 rounded-full" style={{
              width: '100%',
              animation: 'progress 2s ease-in-out forwards'
            }}></div>
          </div>

          {/* Success Message */}
          <p className="text-sm text-maroon-600 mt-4 font-medium">✓ Successfully signed in</p>
        </div>

        {/* CSS Animation */}
        <style jsx>{`
          @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your customer account</p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
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
              placeholder="Enter your email"
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
              className="w-full bg-maroon-600 hover:bg-maroon-700 focus:ring-maroon-500"
            >
              Sign in
            </LoadingButton>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          <div className="text-center">
            <span className="text-sm text-gray-600">Don't have an account? </span>
            <Link 
              href="/register" 
              className="text-sm font-medium text-maroon-600 hover:text-maroon-500"
            >
              Create one now
            </Link>
          </div>
          
          <div className="text-center">
            <Link 
              href="/checkout" 
              className="text-sm font-medium text-gray-600 hover:text-gray-500"
            >
              Continue as guest for checkout
            </Link>
          </div>

          <div className="border-t pt-4 text-center">
            <Link 
              href="/" 
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to store
            </Link>
          </div>
        </div>

        {/* Staff login link */}
        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-gray-500 mb-2">Staff member?</p>
          <Link 
            href="/staff-login" 
            className="text-xs text-maroon-600 hover:text-maroon-500"
          >
            Staff Sign In →
          </Link>
        </div>
      </div>
    </div>
  )
}
