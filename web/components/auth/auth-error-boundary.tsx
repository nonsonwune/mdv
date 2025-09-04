/**
 * Auth Error Boundary Component
 * 
 * Catches and handles authentication-related errors that occur in the component tree.
 * Provides fallback UI with retry options and graceful degradation for auth failures.
 * Integrates with the auth context and error handling system.
 * 
 * @example
 * <AuthErrorBoundary fallback={<CustomFallback />}>
 *   <ProtectedComponent />
 * </AuthErrorBoundary>
 */

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { 
  RefreshCw, 
  AlertTriangle, 
  Shield, 
  Home, 
  LogIn,
  Wifi,
  Server
} from 'lucide-react'

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showRetry?: boolean
  showNavigation?: boolean
  className?: string
}

interface AuthErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
}

interface AuthError extends Error {
  status?: number
  type?: 'network' | 'auth' | 'permission' | 'server' | 'unknown'
  retryable?: boolean
}

export class AuthErrorBoundary extends Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo)

    // Report to error tracking service
    this.reportError(error, errorInfo)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Report to error tracking service (e.g., Sentry, LogRocket)
    try {
      // Example: Sentry.captureException(error, { extra: errorInfo })
      console.error('Error reported to tracking service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private categorizeError = (error: Error): AuthError => {
    const authError = error as AuthError

    // Check for network errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      authError.type = 'network'
      authError.retryable = true
      return authError
    }

    // Check for HTTP status codes
    if (authError.status) {
      switch (authError.status) {
        case 401:
          authError.type = 'auth'
          authError.retryable = false
          break
        case 403:
          authError.type = 'permission'
          authError.retryable = false
          break
        case 408:
        case 429:
        case 502:
        case 503:
        case 504:
          authError.type = 'server'
          authError.retryable = true
          break
        default:
          authError.type = 'unknown'
          authError.retryable = false
      }
    } else {
      // Generic error
      authError.type = 'unknown'
      authError.retryable = true
    }

    return authError
  }

  private handleRetry = () => {
    const { retryCount } = this.state
    
    if (retryCount >= 3) {
      console.warn('Maximum retry attempts reached')
      return
    }

    this.setState({ 
      isRetrying: true,
      retryCount: retryCount + 1
    })

    // Delay retry with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      })
    }, delay)
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleGoToLogin = () => {
    window.location.href = '/login'
  }

  private getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return <Wifi className="h-5 w-5" />
      case 'auth':
        return <Shield className="h-5 w-5" />
      case 'permission':
        return <Shield className="h-5 w-5" />
      case 'server':
        return <Server className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  private getErrorMessage = (error: AuthError): string => {
    switch (error.type) {
      case 'network':
        return 'Network connection failed. Please check your internet connection and try again.'
      case 'auth':
        return 'Your session has expired. Please log in again to continue.'
      case 'permission':
        return 'You do not have permission to access this resource.'
      case 'server':
        return 'Server temporarily unavailable. Please try again in a moment.'
      default:
        return error.message || 'An unexpected error occurred. Please try again.'
    }
  }

  private renderFallbackUI = () => {
    const { showRetry = true, showNavigation = true, className = '' } = this.props
    const { error, retryCount, isRetrying } = this.state
    
    if (!error) return null

    const authError = this.categorizeError(error)
    const canRetry = authError.retryable && retryCount < 3 && !isRetrying
    const errorMessage = this.getErrorMessage(authError)
    const errorIcon = this.getErrorIcon(authError.type || 'unknown')

    return (
      <div className={`min-h-[400px] flex items-center justify-center p-4 ${className}`}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              {errorIcon}
            </div>
            <CardTitle className="text-lg">
              {authError.type === 'auth' ? 'Authentication Required' : 'Something went wrong'}
            </CardTitle>
            <CardDescription>
              {errorMessage}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {retryCount > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Retry attempt {retryCount} of 3 failed. 
                  {canRetry && ' You can try again.'}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              {canRetry && showRetry && (
                <Button
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                  className="w-full"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </>
                  )}
                </Button>
              )}

              {showNavigation && (
                <div className="flex gap-2">
                  {authError.type === 'auth' ? (
                    <Button
                      variant="outline"
                      onClick={this.handleGoToLogin}
                      className="flex-1"
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Log In
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="flex-1"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Go Home
                    </Button>
                  )}
                </div>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  render() {
    const { hasError } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Render custom fallback if provided, otherwise render default
      return fallback || this.renderFallbackUI()
    }

    return children
  }
}

/**
 * Higher-order component for wrapping components with auth error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AuthErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AuthErrorBoundary>
  )

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Protected Route Error Boundary
 *
 * Specialized error boundary for protected routes that require authentication.
 * Automatically redirects to login for auth errors and provides appropriate fallbacks.
 */
export function ProtectedRouteErrorBoundary({
  children,
  redirectTo = '/login',
  ...props
}: AuthErrorBoundaryProps & { redirectTo?: string }) {
  const handleAuthError = (error: Error, errorInfo: ErrorInfo) => {
    const authError = error as AuthError

    // Auto-redirect for auth errors on protected routes
    if (authError.status === 401 || authError.type === 'auth') {
      const currentPath = window.location.pathname
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
      window.location.href = redirectUrl
      return
    }

    // Call original onError if provided
    props.onError?.(error, errorInfo)
  }

  return (
    <AuthErrorBoundary
      {...props}
      onError={handleAuthError}
      showNavigation={true}
    >
      {children}
    </AuthErrorBoundary>
  )
}

/**
 * Hook for manually triggering auth error boundary
 */
export function useAuthErrorBoundary() {
  return {
    captureError: (error: Error) => {
      // Throw error to be caught by nearest error boundary
      throw error
    },
    captureAuthError: (status: number, message: string, type?: string) => {
      const error = new Error(message) as AuthError
      error.status = status
      error.type = type as any
      throw error
    }
  }
}
