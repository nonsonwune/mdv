/**
 * Async Error Boundary Component
 * 
 * Specialized error boundary for handling async operation errors.
 * Provides retry mechanisms and loading states for async operations.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Loader2, Wifi, WifiOff } from 'lucide-react'

interface AsyncError extends Error {
  status?: number
  code?: string
  isNetworkError?: boolean
  isTimeoutError?: boolean
  retryable?: boolean
}

interface AsyncErrorBoundaryState {
  hasError: boolean
  error: AsyncError | null
  errorInfo: ErrorInfo | null
  isRetrying: boolean
  retryCount: number
  isOnline: boolean
}

interface AsyncErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: AsyncError, errorInfo: ErrorInfo) => void
  onRetry?: () => Promise<void> | void
  maxRetries?: number
  retryDelay?: number
  showNetworkStatus?: boolean
}

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps, AsyncErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: AsyncErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryCount: 0,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
    }
  }

  static getDerivedStateFromError(error: AsyncError): Partial<AsyncErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: AsyncError, errorInfo: ErrorInfo) {
    console.error('Async Error Boundary caught an error:', error, errorInfo)
    
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

  componentDidMount() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }
  }

  private handleOnline = () => {
    this.setState({ isOnline: true })
    
    // Auto-retry if we were offline and have a retryable error
    if (this.state.hasError && this.isRetryableError(this.state.error)) {
      this.handleRetry()
    }
  }

  private handleOffline = () => {
    this.setState({ isOnline: false })
  }

  private reportError = (error: AsyncError, errorInfo: ErrorInfo) => {
    // Report to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          errorBoundary: 'AsyncErrorBoundary',
          isNetworkError: this.isNetworkError(error),
          isRetryable: this.isRetryableError(error)
        }
      })
    }
  }

  private isNetworkError = (error: AsyncError | null): boolean => {
    if (!error) return false
    if (error.isNetworkError) return true
    if (error.message && /network|fetch|connection|timeout/i.test(error.message)) return true
    if (error.name === 'TypeError' && error.message.includes('fetch')) return true
    return false
  }

  private isRetryableError = (error: AsyncError | null): boolean => {
    if (!error) return false
    if (error.retryable !== undefined) return error.retryable
    if (this.isNetworkError(error)) return true
    if (error.status && [408, 429, 500, 502, 503, 504].includes(error.status)) return true
    return false
  }

  private getErrorType = (error: AsyncError | null): 'network' | 'timeout' | 'server' | 'client' | 'unknown' => {
    if (!error) return 'unknown'
    if (error.isTimeoutError || error.message?.includes('timeout')) return 'timeout'
    if (this.isNetworkError(error)) return 'network'
    if (error.status && error.status >= 500) return 'server'
    if (error.status && error.status >= 400) return 'client'
    return 'unknown'
  }

  private handleRetry = async () => {
    const { maxRetries = 3, retryDelay = 1000, onRetry } = this.props
    
    if (this.state.retryCount >= maxRetries) {
      return
    }

    this.setState({ isRetrying: true })

    try {
      // Call custom retry handler if provided
      if (onRetry) {
        await onRetry()
      }

      // Wait for retry delay
      await new Promise(resolve => {
        this.retryTimeoutId = setTimeout(resolve, retryDelay * Math.pow(2, this.state.retryCount))
      })

      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        retryCount: this.state.retryCount + 1
      })
    } catch (retryError) {
      console.error('Retry failed:', retryError)
      this.setState({
        isRetrying: false,
        retryCount: this.state.retryCount + 1
      })
    }
  }

  private renderErrorMessage = (errorType: string, error: AsyncError) => {
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Problem',
          message: this.state.isOnline 
            ? 'Unable to connect to the server. Please try again.'
            : 'You appear to be offline. Please check your internet connection.',
          icon: this.state.isOnline ? <Wifi className="w-8 h-8 text-orange-500" /> : <WifiOff className="w-8 h-8 text-red-500" />
        }
      
      case 'timeout':
        return {
          title: 'Request Timeout',
          message: 'The request took too long to complete. Please try again.',
          icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />
        }
      
      case 'server':
        return {
          title: 'Server Error',
          message: 'The server encountered an error. Please try again in a moment.',
          icon: <AlertTriangle className="w-8 h-8 text-red-500" />
        }
      
      case 'client':
        return {
          title: 'Request Error',
          message: 'There was a problem with your request. Please check and try again.',
          icon: <AlertTriangle className="w-8 h-8 text-orange-500" />
        }
      
      default:
        return {
          title: 'Something went wrong',
          message: 'An unexpected error occurred. Please try again.',
          icon: <AlertTriangle className="w-8 h-8 text-gray-500" />
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
      const { maxRetries = 3, showNetworkStatus = true } = this.props
      const canRetry = this.isRetryableError(this.state.error) && this.state.retryCount < maxRetries

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4">
            {errorConfig.icon}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {errorConfig.title}
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md">
            {errorConfig.message}
          </p>

          {/* Network status indicator */}
          {showNetworkStatus && (
            <div className={`flex items-center mb-4 px-3 py-1 rounded-full text-sm ${
              this.state.isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {this.state.isOnline ? (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 mr-2" />
                  Offline
                </>
              )}
            </div>
          )}

          {/* Retry button */}
          {canRetry && (
            <button
              onClick={this.handleRetry}
              disabled={this.state.isRetrying || !this.state.isOnline}
              className="flex items-center px-4 py-2 bg-maroon-600 text-white rounded-md hover:bg-maroon-700 focus:outline-none focus:ring-2 focus:ring-maroon-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {this.state.isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </button>
          )}

          {/* Retry count indicator */}
          {this.state.retryCount > 0 && (
            <p className="mt-3 text-sm text-gray-500">
              Attempt {this.state.retryCount} of {maxRetries}
            </p>
          )}

          {/* Max retries reached */}
          {this.state.retryCount >= maxRetries && (
            <p className="mt-3 text-sm text-red-600">
              Maximum retry attempts reached. Please refresh the page or contact support.
            </p>
          )}

          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left max-w-md">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700">
                <div><strong>Error:</strong> {this.state.error.message}</div>
                <div><strong>Status:</strong> {this.state.error.status}</div>
                <div><strong>Type:</strong> {errorType}</div>
                <div><strong>Retryable:</strong> {this.isRetryableError(this.state.error) ? 'Yes' : 'No'}</div>
                <div><strong>Network:</strong> {this.isNetworkError(this.state.error) ? 'Yes' : 'No'}</div>
              </div>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with async error boundary
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AsyncErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AsyncErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AsyncErrorBoundary>
  )
  
  WrappedComponent.displayName = `withAsyncErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
