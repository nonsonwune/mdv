/**
 * Error Recovery Components
 * 
 * Provides automated and manual error recovery mechanisms
 * with intelligent retry strategies and fallback options.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface ErrorRecoveryProps {
  error: any
  onRetry: () => Promise<void> | void
  onFallback?: () => void
  maxRetries?: number
  retryDelay?: number
  autoRetry?: boolean
  showProgress?: boolean
  fallbackComponent?: React.ReactNode
  children?: React.ReactNode
}

export function ErrorRecovery({
  error,
  onRetry,
  onFallback,
  maxRetries = 3,
  retryDelay = 1000,
  autoRetry = false,
  showProgress = true,
  fallbackComponent,
  children
}: ErrorRecoveryProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [nextRetryTime, setNextRetryTime] = useState<number | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const countdownIntervalRef = useRef<NodeJS.Timeout>()

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && error && autoRetry && retryCount < maxRetries && !isRetrying) {
      handleRetry()
    }
  }, [isOnline, error, autoRetry, retryCount, maxRetries, isRetrying])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [])

  const isRetryable = useCallback((err: any): boolean => {
    // Network errors are retryable
    if (err?.name === 'TypeError' && err?.message?.includes('fetch')) return true
    if (err?.message && /network|connection|timeout/i.test(err.message)) return true
    
    // HTTP status codes that are retryable
    if (err?.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504]
      return retryableStatuses.includes(err.status)
    }

    // Explicit retryable flag
    return err?.retryable === true
  }, [])

  const calculateRetryDelay = useCallback((attempt: number): number => {
    // Exponential backoff with jitter
    const baseDelay = retryDelay * Math.pow(2, attempt)
    const jitter = Math.random() * 0.1 * baseDelay
    return Math.min(baseDelay + jitter, 30000) // Max 30 seconds
  }, [retryDelay])

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries || isRetrying) return

    setIsRetrying(true)
    
    try {
      const delay = calculateRetryDelay(retryCount)
      
      if (showProgress) {
        setNextRetryTime(Date.now() + delay)
        
        // Update countdown
        countdownIntervalRef.current = setInterval(() => {
          setNextRetryTime(prev => {
            if (!prev || prev <= Date.now()) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current)
              }
              return null
            }
            return prev
          })
        }, 100)
      }

      // Wait for delay
      await new Promise(resolve => {
        retryTimeoutRef.current = setTimeout(resolve, delay)
      })

      setNextRetryTime(null)
      
      // Attempt retry
      await onRetry()
      
      // Success - reset retry count
      setRetryCount(0)
    } catch (retryError) {
      console.error('Retry failed:', retryError)
      setRetryCount(prev => prev + 1)
    } finally {
      setIsRetrying(false)
    }
  }, [retryCount, maxRetries, isRetrying, calculateRetryDelay, showProgress, onRetry])

  const handleManualRetry = useCallback(() => {
    if (!isRetrying && retryCount < maxRetries) {
      handleRetry()
    }
  }, [isRetrying, retryCount, maxRetries, handleRetry])

  const handleFallback = useCallback(() => {
    if (onFallback) {
      onFallback()
    }
  }, [onFallback])

  const getRetryButtonText = () => {
    if (isRetrying) {
      if (nextRetryTime) {
        const remainingTime = Math.ceil((nextRetryTime - Date.now()) / 1000)
        return `Retrying in ${remainingTime}s...`
      }
      return 'Retrying...'
    }
    
    if (retryCount === 0) {
      return 'Try Again'
    }
    
    return `Try Again (${retryCount}/${maxRetries})`
  }

  const canRetry = isRetryable(error) && retryCount < maxRetries && isOnline
  const hasReachedMaxRetries = retryCount >= maxRetries

  if (!error) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
      {/* Error Icon */}
      <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>

      {/* Error Message */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Something went wrong
        </h3>
        <p className="text-gray-600 max-w-md">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>

      {/* Network Status */}
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
        isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Offline</span>
          </>
        )}
      </div>

      {/* Retry Progress */}
      {showProgress && retryCount > 0 && (
        <div className="text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Attempt {retryCount} of {maxRetries}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Retry Button */}
        {canRetry && (
          <button
            onClick={handleManualRetry}
            disabled={isRetrying || !isOnline}
            className="flex items-center justify-center px-4 py-2 bg-maroon-600 text-white rounded-md hover:bg-maroon-700 focus:outline-none focus:ring-2 focus:ring-maroon-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {getRetryButtonText()}
          </button>
        )}

        {/* Fallback Button */}
        {(hasReachedMaxRetries || !canRetry) && onFallback && (
          <button
            onClick={handleFallback}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Use Fallback
          </button>
        )}
      </div>

      {/* Max Retries Message */}
      {hasReachedMaxRetries && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          Maximum retry attempts reached. Please refresh the page or contact support.
        </div>
      )}

      {/* Fallback Component */}
      {hasReachedMaxRetries && fallbackComponent && (
        <div className="w-full mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Fallback Mode</h4>
          {fallbackComponent}
        </div>
      )}

      {/* Auto-retry indicator */}
      {autoRetry && canRetry && !isRetrying && (
        <div className="text-xs text-gray-500">
          Auto-retry is enabled. Will retry when connection is restored.
        </div>
      )}
    </div>
  )
}

/**
 * Smart Retry Component with Circuit Breaker Pattern
 */
interface SmartRetryProps {
  children: React.ReactNode
  onError?: (error: any) => void
  fallback?: React.ReactNode
  circuitBreakerThreshold?: number
  circuitBreakerTimeout?: number
}

export function SmartRetry({
  children,
  onError,
  fallback,
  circuitBreakerThreshold = 5,
  circuitBreakerTimeout = 60000
}: SmartRetryProps) {
  const [errorCount, setErrorCount] = useState(0)
  const [isCircuitOpen, setIsCircuitOpen] = useState(false)
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null)

  // Check if circuit breaker should be reset
  useEffect(() => {
    if (isCircuitOpen && lastErrorTime) {
      const timer = setTimeout(() => {
        setIsCircuitOpen(false)
        setErrorCount(0)
      }, circuitBreakerTimeout)

      return () => clearTimeout(timer)
    }
  }, [isCircuitOpen, lastErrorTime, circuitBreakerTimeout])

  const handleError = useCallback((error: any) => {
    const newErrorCount = errorCount + 1
    setErrorCount(newErrorCount)
    setLastErrorTime(Date.now())

    // Open circuit breaker if threshold reached
    if (newErrorCount >= circuitBreakerThreshold) {
      setIsCircuitOpen(true)
    }

    if (onError) {
      onError(error)
    }
  }, [errorCount, circuitBreakerThreshold, onError])

  const handleSuccess = useCallback(() => {
    // Reset circuit breaker on success
    setErrorCount(0)
    setIsCircuitOpen(false)
    setLastErrorTime(null)
  }, [])

  if (isCircuitOpen) {
    return (
      <div className="p-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Service Temporarily Unavailable
        </h3>
        <p className="text-gray-600 mb-4">
          Too many errors detected. The service is temporarily disabled to prevent further issues.
        </p>
        <p className="text-sm text-gray-500">
          Service will be restored automatically in {Math.ceil(circuitBreakerTimeout / 1000)} seconds.
        </p>
        {fallback && (
          <div className="mt-6">
            {fallback}
          </div>
        )}
      </div>
    )
  }

  return (
    <ErrorBoundary onError={handleError} onSuccess={handleSuccess}>
      {children}
    </ErrorBoundary>
  )
}

/**
 * Error Boundary with Success Callback
 */
interface ErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: any) => void
  onSuccess?: () => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    if (this.props.onError) {
      this.props.onError(error)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when children change (indicating recovery)
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false })
      if (this.props.onSuccess) {
        this.props.onSuccess()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return null // Let parent handle error display
    }

    return this.props.children
  }
}
