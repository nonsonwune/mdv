/**
 * Auth Retry Hook
 * 
 * Specialized retry mechanism for authentication-related operations.
 * Provides exponential backoff, circuit breaker pattern, and intelligent
 * retry conditions specifically designed for auth flows.
 * 
 * @example
 * const { executeWithRetry, isRetrying, retryCount, canRetry } = useAuthRetry()
 * 
 * const handleLogin = async () => {
 *   try {
 *     await executeWithRetry(async () => {
 *       const response = await fetch('/api/auth/login', { ... })
 *       if (!response.ok) throw new Error('Login failed')
 *       return response.json()
 *     })
 *   } catch (error) {
 *     // Handle final failure
 *   }
 * }
 */

import { useCallback, useState, useRef } from 'react'
import { useErrorRecovery } from './use-error-recovery'

interface AuthRetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  exponentialBackoff?: boolean
  autoRetry?: boolean
  retryCondition?: (error: any, attempt: number) => boolean
  onRetrySuccess?: () => void
  onRetryFailure?: (error: any, attempt: number) => void
  onFinalFailure?: (error: any) => void
}

interface AuthRetryState {
  isRetrying: boolean
  retryCount: number
  lastError: any | null
  canRetry: boolean
  circuitOpen: boolean
}

const DEFAULT_OPTIONS: Required<AuthRetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  exponentialBackoff: true,
  autoRetry: false,
  retryCondition: (error: any) => {
    // Default: retry network errors and temporary server errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return true // Network error
    }
    
    if (error.status) {
      // Retry temporary server errors
      return [408, 429, 502, 503, 504].includes(error.status)
    }
    
    return false
  },
  onRetrySuccess: () => {},
  onRetryFailure: () => {},
  onFinalFailure: () => {}
}

export function useAuthRetry(options: AuthRetryOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  const [state, setState] = useState<AuthRetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    canRetry: false,
    circuitOpen: false
  })
  
  // Circuit breaker state
  const circuitRef = useRef({
    failures: 0,
    lastFailureTime: 0,
    openUntil: 0
  })
  
  // Check if circuit breaker should be open
  const isCircuitOpen = useCallback(() => {
    const now = Date.now()
    const circuit = circuitRef.current
    
    // Reset circuit if timeout has passed
    if (circuit.openUntil > 0 && now > circuit.openUntil) {
      circuit.failures = 0
      circuit.openUntil = 0
      setState(prev => ({ ...prev, circuitOpen: false }))
      return false
    }
    
    return circuit.openUntil > 0
  }, [])
  
  // Open circuit breaker
  const openCircuit = useCallback(() => {
    const circuit = circuitRef.current
    circuit.openUntil = Date.now() + 60000 // Open for 1 minute
    setState(prev => ({ ...prev, circuitOpen: true, canRetry: false }))
  }, [])
  
  // Record failure for circuit breaker
  const recordFailure = useCallback(() => {
    const circuit = circuitRef.current
    const now = Date.now()
    
    // Reset failure count if last failure was more than 1 minute ago
    if (now - circuit.lastFailureTime > 60000) {
      circuit.failures = 0
    }
    
    circuit.failures++
    circuit.lastFailureTime = now
    
    // Open circuit if too many failures
    if (circuit.failures >= 5) {
      openCircuit()
    }
  }, [openCircuit])
  
  // Record success for circuit breaker
  const recordSuccess = useCallback(() => {
    const circuit = circuitRef.current
    circuit.failures = 0
    circuit.lastFailureTime = 0
    circuit.openUntil = 0
    setState(prev => ({ ...prev, circuitOpen: false }))
  }, [])
  
  // Calculate delay with exponential backoff
  const calculateDelay = useCallback((attempt: number): number => {
    if (!opts.exponentialBackoff) {
      return opts.initialDelay
    }
    
    const delay = opts.initialDelay * Math.pow(2, attempt - 1)
    return Math.min(delay, opts.maxDelay)
  }, [opts.exponentialBackoff, opts.initialDelay, opts.maxDelay])
  
  // Execute operation with retry logic
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    // Check circuit breaker
    if (isCircuitOpen()) {
      throw new Error('Authentication service temporarily unavailable')
    }
    
    setState(prev => ({ 
      ...prev, 
      isRetrying: true, 
      retryCount: 0, 
      lastError: null,
      canRetry: false 
    }))
    
    let lastError: any
    
    for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
      try {
        const result = await operation()
        
        // Success - reset state and record success
        recordSuccess()
        setState(prev => ({ 
          ...prev, 
          isRetrying: false, 
          retryCount: 0, 
          lastError: null,
          canRetry: false 
        }))
        opts.onRetrySuccess()
        
        return result
      } catch (error) {
        lastError = error
        recordFailure()
        
        const isLastAttempt = attempt > opts.maxRetries
        const shouldRetry = !isLastAttempt && opts.retryCondition(error, attempt)
        
        setState(prev => ({ 
          ...prev, 
          retryCount: attempt - 1,
          lastError: error,
          canRetry: shouldRetry && !isCircuitOpen()
        }))
        
        if (isLastAttempt) {
          // Final failure
          setState(prev => ({ ...prev, isRetrying: false }))
          opts.onFinalFailure(error)
          throw error
        }
        
        if (!shouldRetry) {
          // Non-retryable error
          setState(prev => ({ ...prev, isRetrying: false }))
          opts.onFinalFailure(error)
          throw error
        }
        
        // Circuit breaker check after failure
        if (isCircuitOpen()) {
          setState(prev => ({ ...prev, isRetrying: false }))
          throw new Error('Authentication service temporarily unavailable')
        }
        
        // Wait before retry
        opts.onRetryFailure(error, attempt)
        const delay = calculateDelay(attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // Should never reach here, but just in case
    setState(prev => ({ ...prev, isRetrying: false }))
    throw lastError
  }, [
    isCircuitOpen, 
    opts, 
    recordSuccess, 
    recordFailure, 
    calculateDelay
  ])
  
  // Manual retry function
  const retry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    if (!state.canRetry || state.isRetrying) {
      throw new Error('Cannot retry at this time')
    }
    
    return executeWithRetry(operation)
  }, [state.canRetry, state.isRetrying, executeWithRetry])
  
  // Reset retry state
  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      canRetry: false,
      circuitOpen: false
    })
    
    // Reset circuit breaker
    const circuit = circuitRef.current
    circuit.failures = 0
    circuit.lastFailureTime = 0
    circuit.openUntil = 0
  }, [])
  
  return {
    ...state,
    executeWithRetry,
    retry,
    reset,
    // Utility functions
    getRetryDelay: (attempt: number) => calculateDelay(attempt),
    getRemainingRetries: () => Math.max(0, opts.maxRetries - state.retryCount),
    getRetryMessage: () => {
      if (state.circuitOpen) {
        return 'Service temporarily unavailable. Please try again in a moment.'
      }
      
      if (state.isRetrying) {
        return `Retrying... (attempt ${state.retryCount + 1}/${opts.maxRetries + 1})`
      }
      
      if (state.canRetry) {
        return `Retry available (${state.retryCount}/${opts.maxRetries} attempts used)`
      }
      
      return ''
    }
  }
}

/**
 * Specialized auth retry hook for login operations
 */
export function useLoginRetry() {
  return useAuthRetry({
    maxRetries: 2, // Fewer retries for login
    initialDelay: 2000,
    autoRetry: false, // Manual retry only for login
    retryCondition: (error: any) => {
      // Only retry network errors and temporary server errors for login
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        return true
      }
      
      if (error.status) {
        return [408, 502, 503, 504].includes(error.status)
      }
      
      return false
    }
  })
}

/**
 * Specialized auth retry hook for token refresh operations
 */
export function useTokenRefreshRetry() {
  return useAuthRetry({
    maxRetries: 3,
    initialDelay: 500,
    autoRetry: true, // Auto-retry token refresh
    retryCondition: (error: any) => {
      // Retry network errors and temporary server errors
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        return true
      }
      
      if (error.status) {
        // Don't retry 401 (expired token) or 403 (forbidden)
        return [408, 429, 502, 503, 504].includes(error.status)
      }
      
      return false
    }
  })
}
