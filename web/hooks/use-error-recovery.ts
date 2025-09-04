/**
 * Error Recovery Hook
 * 
 * Provides intelligent error recovery mechanisms with automatic retry,
 * circuit breaker patterns, and fallback strategies.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

interface ErrorRecoveryState {
  error: any | null
  isRetrying: boolean
  retryCount: number
  lastRetryTime: number | null
  isCircuitOpen: boolean
  errorHistory: Array<{ error: any; timestamp: number }>
}

interface ErrorRecoveryOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
  circuitBreakerThreshold?: number
  circuitBreakerTimeout?: number
  autoRetry?: boolean
  retryCondition?: (error: any) => boolean
  onRetrySuccess?: () => void
  onRetryFailure?: (error: any, attempt: number) => void
  onCircuitOpen?: () => void
  onCircuitClose?: () => void
}

interface ErrorRecoveryReturn {
  // State
  error: any | null
  isRetrying: boolean
  retryCount: number
  canRetry: boolean
  isCircuitOpen: boolean
  errorHistory: Array<{ error: any; timestamp: number }>
  
  // Actions
  handleError: (error: any) => void
  retry: () => Promise<void>
  reset: () => void
  clearHistory: () => void
  
  // Utilities
  getNextRetryDelay: () => number
  isRetryable: (error?: any) => boolean
  getErrorRate: (timeWindow?: number) => number
}

export function useErrorRecovery(
  retryFunction: () => Promise<void>,
  options: ErrorRecoveryOptions = {}
): ErrorRecoveryReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    circuitBreakerThreshold = 5,
    circuitBreakerTimeout = 60000,
    autoRetry = false,
    retryCondition,
    onRetrySuccess,
    onRetryFailure,
    onCircuitOpen,
    onCircuitClose
  } = options

  const [state, setState] = useState<ErrorRecoveryState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastRetryTime: null,
    isCircuitOpen: false,
    errorHistory: []
  })

  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const circuitTimeoutRef = useRef<NodeJS.Timeout>()

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      if (circuitTimeoutRef.current) clearTimeout(circuitTimeoutRef.current)
    }
  }, [])

  // Auto-retry logic
  useEffect(() => {
    if (autoRetry && state.error && !state.isRetrying && !state.isCircuitOpen && state.retryCount < maxRetries) {
      const delay = getNextRetryDelay()
      retryTimeoutRef.current = setTimeout(() => {
        retry()
      }, delay)
    }
  }, [autoRetry, state.error, state.isRetrying, state.isCircuitOpen, state.retryCount, maxRetries])

  // Circuit breaker timeout
  useEffect(() => {
    if (state.isCircuitOpen) {
      circuitTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, isCircuitOpen: false, retryCount: 0 }))
        if (onCircuitClose) onCircuitClose()
      }, circuitBreakerTimeout)
    }
  }, [state.isCircuitOpen, circuitBreakerTimeout, onCircuitClose])

  const isRetryable = useCallback((error?: any): boolean => {
    const targetError = error || state.error
    if (!targetError) return false

    // Use custom retry condition if provided
    if (retryCondition) {
      return retryCondition(targetError)
    }

    // Default retry conditions
    // Network errors
    if (targetError.name === 'TypeError' && targetError.message?.includes('fetch')) return true
    if (targetError.message && /network|connection|timeout/i.test(targetError.message)) return true
    
    // HTTP status codes
    if (targetError.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504]
      return retryableStatuses.includes(targetError.status)
    }

    // Explicit retryable flag
    return targetError.retryable === true
  }, [state.error, retryCondition])

  const getNextRetryDelay = useCallback((): number => {
    if (!exponentialBackoff) return retryDelay

    // Exponential backoff with jitter
    const baseDelay = retryDelay * Math.pow(2, state.retryCount)
    const jitter = Math.random() * 0.1 * baseDelay
    return Math.min(baseDelay + jitter, 30000) // Max 30 seconds
  }, [retryDelay, exponentialBackoff, state.retryCount])

  const getErrorRate = useCallback((timeWindow = 60000): number => {
    const now = Date.now()
    const recentErrors = state.errorHistory.filter(
      entry => now - entry.timestamp <= timeWindow
    )
    return recentErrors.length / (timeWindow / 1000) // errors per second
  }, [state.errorHistory])

  const handleError = useCallback((error: any) => {
    const now = Date.now()
    
    setState(prev => {
      const newErrorHistory = [
        ...prev.errorHistory,
        { error, timestamp: now }
      ].slice(-20) // Keep last 20 errors

      // Check if circuit breaker should open
      const recentErrors = newErrorHistory.filter(
        entry => now - entry.timestamp <= 60000 // Last minute
      )
      
      const shouldOpenCircuit = recentErrors.length >= circuitBreakerThreshold

      if (shouldOpenCircuit && !prev.isCircuitOpen) {
        if (onCircuitOpen) onCircuitOpen()
      }

      return {
        ...prev,
        error,
        errorHistory: newErrorHistory,
        isCircuitOpen: shouldOpenCircuit,
        retryCount: prev.error === error ? prev.retryCount : 0 // Reset for new errors
      }
    })
  }, [circuitBreakerThreshold, onCircuitOpen])

  const retry = useCallback(async (): Promise<void> => {
    if (state.isRetrying || state.isCircuitOpen || state.retryCount >= maxRetries) {
      return
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      lastRetryTime: Date.now()
    }))

    try {
      await retryFunction()
      
      // Success - reset state
      setState(prev => ({
        ...prev,
        error: null,
        isRetrying: false,
        retryCount: 0,
        isCircuitOpen: false
      }))

      if (onRetrySuccess) onRetrySuccess()
    } catch (retryError) {
      setState(prev => ({
        ...prev,
        error: retryError,
        isRetrying: false,
        retryCount: prev.retryCount + 1
      }))

      if (onRetryFailure) onRetryFailure(retryError, state.retryCount + 1)
    }
  }, [state.isRetrying, state.isCircuitOpen, state.retryCount, maxRetries, retryFunction, onRetrySuccess, onRetryFailure])

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    if (circuitTimeoutRef.current) clearTimeout(circuitTimeoutRef.current)
    
    setState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      lastRetryTime: null,
      isCircuitOpen: false,
      errorHistory: []
    })
  }, [])

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      errorHistory: []
    }))
  }, [])

  const canRetry = !state.isRetrying && 
                   !state.isCircuitOpen && 
                   state.retryCount < maxRetries && 
                   isRetryable(state.error)

  return {
    // State
    error: state.error,
    isRetrying: state.isRetrying,
    retryCount: state.retryCount,
    canRetry,
    isCircuitOpen: state.isCircuitOpen,
    errorHistory: state.errorHistory,
    
    // Actions
    handleError,
    retry,
    reset,
    clearHistory,
    
    // Utilities
    getNextRetryDelay,
    isRetryable,
    getErrorRate
  }
}

/**
 * Hook for handling async operations with automatic error recovery
 */
export function useAsyncWithRecovery<T = any>(
  asyncFunction: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const recovery = useErrorRecovery(
    async () => {
      setIsLoading(true)
      try {
        const result = await asyncFunction()
        setData(result)
      } finally {
        setIsLoading(false)
      }
    },
    {
      ...options,
      onRetrySuccess: () => {
        if (options.onRetrySuccess) options.onRetrySuccess()
      }
    }
  )

  const execute = useCallback(async () => {
    setIsLoading(true)
    recovery.reset()

    try {
      const result = await asyncFunction()
      setData(result)
      return result
    } catch (error) {
      recovery.handleError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [asyncFunction, recovery])

  return {
    // Data state
    data,
    isLoading,
    
    // Recovery state and actions
    ...recovery,
    
    // Execution
    execute
  }
}

/**
 * Hook for handling multiple async operations with shared error recovery
 */
export function useMultiAsyncRecovery(
  operations: Record<string, () => Promise<any>>,
  options: ErrorRecoveryOptions = {}
) {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const recovery = useErrorRecovery(
    async () => {
      // Retry all failed operations
      const failedOperations = Object.entries(operations).filter(
        ([key]) => !results[key] && recovery.error
      )

      for (const [key, operation] of failedOperations) {
        setLoadingStates(prev => ({ ...prev, [key]: true }))
        try {
          const result = await operation()
          setResults(prev => ({ ...prev, [key]: result }))
        } finally {
          setLoadingStates(prev => ({ ...prev, [key]: false }))
        }
      }
    },
    options
  )

  const executeOperation = useCallback(async (key: string) => {
    const operation = operations[key]
    if (!operation) return

    setLoadingStates(prev => ({ ...prev, [key]: true }))
    
    try {
      const result = await operation()
      setResults(prev => ({ ...prev, [key]: result }))
      return result
    } catch (error) {
      recovery.handleError(error)
      throw error
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }))
    }
  }, [operations, recovery])

  const executeAll = useCallback(async () => {
    const promises = Object.entries(operations).map(([key, operation]) =>
      executeOperation(key)
    )

    try {
      await Promise.all(promises)
    } catch (error) {
      // Individual operations handle their own errors
    }
  }, [operations, executeOperation])

  return {
    // Data state
    results,
    loadingStates,
    isAnyLoading: Object.values(loadingStates).some(Boolean),
    
    // Recovery state and actions
    ...recovery,
    
    // Execution
    executeOperation,
    executeAll
  }
}
