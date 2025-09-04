/**
 * Authentication Error Boundary Component
 * 
 * Specialized error boundary for handling authentication-related errors gracefully.
 * Provides user-friendly error messages and recovery options for auth failures.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, LogOut, Home } from 'lucide-react'

interface AuthError extends Error {
  status?: number
  code?: string
  isAuthError?: boolean
}

interface AuthErrorBoundaryState {
  hasError: boolean
  error: AuthError | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: AuthError, errorInfo: ErrorInfo) => void
  maxRetries?: number
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: AuthError): Partial<AuthErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: AuthError, errorInfo: ErrorInfo) {
    // Log the error for monitoring
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report to error tracking service
    this.reportError(error, errorInfo)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private reportError = (error: AuthError, errorInfo: ErrorInfo) => {
    // Report to error tracking service (e.g., Sentry, LogRocket)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          errorBoundary: 'AuthErrorBoundary',
          isAuthError: this.isAuthenticationError(error)
        }
      })
    }
  }

  private isAuthenticationError = (error: AuthError): boolean => {
    // Check if this is an authentication-related error
    if (error.isAuthError) return true
    if (error.status === 401 || error.status === 403) return true
    if (error.code && ['AUTH_FAILED', 'TOKEN_EXPIRED', 'UNAUTHORIZED'].includes(error.code)) return true
    if (error.message && /auth|token|unauthorized|forbidden/i.test(error.message)) return true
    return false
  }

  private getErrorType = (error: AuthError): 'auth' | 'network' | 'session' | 'permission' | 'unknown' => {
    if (error.status === 401 || error.code === 'TOKEN_EXPIRED') return 'session'
    if (error.status === 403 || error.code === 'UNAUTHORIZED') return 'permission'
    if (error.message && /network|fetch|connection/i.test(error.message)) return 'network'
    if (this.isAuthenticationError(error)) return 'auth'
    return 'unknown'
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleLogout = () => {
    // Clear any stored auth data
    try {
      localStorage.removeItem('auth_hint')
      sessionStorage.clear()
    } catch (e) {
      // Storage not available
    }
    
    // Redirect to login page
    window.location.href = '/staff-login'
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private renderErrorMessage = (errorType: string, error: AuthError) => {
    switch (errorType) {
      case 'session':
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please sign in again to continue.',
          icon: <LogOut className="w-8 h-8 text-amber-500" />,
          actions: [
            { label: 'Sign In Again', onClick: this.handleLogout, variant: 'primary' as const },
            { label: 'Go Home', onClick: this.handleGoHome, variant: 'secondary' as const }
          ]
        }
      
      case 'permission':
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to access this resource. Please contact your administrator.',
          icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
          actions: [
            { label: 'Go Home', onClick: this.handleGoHome, variant: 'primary' as const },
            { label: 'Sign Out', onClick: this.handleLogout, variant: 'secondary' as const }
          ]
        }
      
      case 'network':
        return {
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          icon: <AlertTriangle className="w-8 h-8 text-orange-500" />,
          actions: [
            { label: 'Try Again', onClick: this.handleRetry, variant: 'primary' as const },
            { label: 'Go Home', onClick: this.handleGoHome, variant: 'secondary' as const }
          ]
        }
      
      case 'auth':
        return {
          title: 'Authentication Error',
          message: 'There was a problem with your authentication. Please sign in again.',
          icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
          actions: [
            { label: 'Sign In Again', onClick: this.handleLogout, variant: 'primary' as const },
            { label: 'Go Home', onClick: this.handleGoHome, variant: 'secondary' as const }
          ]
        }
      
      default:
        return {
          title: 'Something went wrong',
          message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
          icon: <AlertTriangle className="w-8 h-8 text-gray-500" />,
          actions: [
            { label: 'Try Again', onClick: this.handleRetry, variant: 'primary' as const },
            { label: 'Go Home', onClick: this.handleGoHome, variant: 'secondary' as const }
          ]
        }
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorType = this.getErrorType(this.state.error)
      const errorConfig = this.renderErrorMessage(errorType, this.state.error)
      const { maxRetries = 3 } = this.props

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {errorConfig.icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {errorConfig.title}
              </h2>
              <p className="text-gray-600 mb-6">
                {errorConfig.message}
              </p>
              
              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700">
                    <div><strong>Error:</strong> {this.state.error.message}</div>
                    <div><strong>Status:</strong> {this.state.error.status}</div>
                    <div><strong>Code:</strong> {this.state.error.code}</div>
                    <div><strong>Retry Count:</strong> {this.state.retryCount}/{maxRetries}</div>
                  </div>
                </details>
              )}
            </div>

            <div className="space-y-3">
              {errorConfig.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.label === 'Try Again' && this.state.retryCount >= maxRetries}
                  className={`
                    w-full flex justify-center items-center py-3 px-4 border rounded-md text-sm font-medium transition-colors
                    ${action.variant === 'primary' 
                      ? 'border-transparent bg-maroon-600 text-white hover:bg-maroon-700 focus:ring-maroon-500' 
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {action.label === 'Try Again' && <RefreshCw className="w-4 h-4 mr-2" />}
                  {action.label === 'Go Home' && <Home className="w-4 h-4 mr-2" />}
                  {action.label.includes('Sign') && <LogOut className="w-4 h-4 mr-2" />}
                  {action.label}
                  {action.label === 'Try Again' && this.state.retryCount >= maxRetries && ' (Max retries reached)'}
                </button>
              ))}
            </div>

            {/* Retry count indicator */}
            {this.state.retryCount > 0 && (
              <div className="text-center text-sm text-gray-500">
                Retry attempt {this.state.retryCount} of {maxRetries}
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with auth error boundary
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
