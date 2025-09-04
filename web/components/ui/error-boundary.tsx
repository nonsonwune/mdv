/**
 * General Error Boundary Component
 * 
 * Catches and handles all types of React errors gracefully.
 * Provides fallback UI and error reporting capabilities.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  showErrorDetails?: boolean
  level?: 'page' | 'component' | 'section'
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError && this.state.errorId) {
      this.props.onError(error, errorInfo, this.state.errorId)
    }

    // Report to error tracking service
    this.reportError(error, errorInfo)
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Report to error tracking service (e.g., Sentry, LogRocket)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          errorBoundary: 'ErrorBoundary',
          level: this.props.level || 'component'
        },
        extra: {
          errorId: this.state.errorId
        }
      })
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Report')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Error ID:', this.state.errorId)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReportBug = () => {
    const { error, errorId } = this.state
    const subject = encodeURIComponent(`Bug Report: ${error?.name || 'Application Error'}`)
    const body = encodeURIComponent(`
Error ID: ${errorId}
Error Message: ${error?.message || 'Unknown error'}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
[Your description here]
    `.trim())
    
    const mailtoUrl = `mailto:support@mdv.com?subject=${subject}&body=${body}`
    window.open(mailtoUrl)
  }

  private renderFallbackUI = () => {
    const { level = 'component', showErrorDetails = false } = this.props
    const { error, errorInfo, errorId } = this.state

    // Different UI based on error boundary level
    if (level === 'page') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Oops! Something went wrong
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
              {errorId && (
                <p className="mt-2 text-xs text-gray-500">
                  Error ID: {errorId}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-maroon-600 hover:bg-maroon-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </button>
              
              <button
                onClick={this.handleReportBug}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <Bug className="w-4 h-4 mr-2" />
                Report Bug
              </button>
            </div>

            {showErrorDetails && error && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-40 overflow-auto">
                  <div><strong>Error:</strong> {error.message}</div>
                  <div><strong>Stack:</strong></div>
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    if (level === 'section') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Section Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>This section encountered an error and couldn't load properly.</p>
                {errorId && (
                  <p className="mt-1 text-xs">Error ID: {errorId}</p>
                )}
              </div>
              <div className="mt-4">
                <div className="flex space-x-2">
                  <button
                    onClick={this.handleRetry}
                    className="bg-red-100 px-2 py-1 rounded text-sm text-red-800 hover:bg-red-200"
                  >
                    Retry
                  </button>
                  <button
                    onClick={this.handleReportBug}
                    className="bg-red-100 px-2 py-1 rounded text-sm text-red-800 hover:bg-red-200"
                  >
                    Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Component level (default)
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Component Error
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>This component encountered an error.</p>
              {errorId && (
                <p className="mt-1 text-xs">Error ID: {errorId}</p>
              )}
            </div>
            <div className="mt-2">
              <button
                onClick={this.handleRetry}
                className="bg-yellow-100 px-2 py-1 rounded text-sm text-yellow-800 hover:bg-yellow-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      return this.renderFallbackUI()
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for manually triggering error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    // This will trigger the nearest error boundary
    throw error
  }
}
