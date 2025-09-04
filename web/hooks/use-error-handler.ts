/**
 * Error handling hook for consistent error management across the application
 * 
 * Provides utilities for handling, displaying, and recovering from errors
 * with appropriate user feedback and logging.
 */

import { useState, useCallback, useRef } from 'react'
import { useToast } from '../app/_components/ToastProvider'
import { getErrorMessage, getContextualErrorMessage, type ErrorMessage } from '../lib/error-messages'

interface ErrorState {
  error: any | null
  isError: boolean
  errorMessage: ErrorMessage | null
  retryCount: number
  lastErrorTime: number | null
}

interface UseErrorHandlerOptions {
  maxRetries?: number
  retryDelay?: number
  showToast?: boolean
  logErrors?: boolean
  context?: 'login' | 'signup' | 'profile' | 'checkout' | 'general'
}

interface UseErrorHandlerReturn {
  // Error state
  error: any | null
  isError: boolean
  errorMessage: ErrorMessage | null
  retryCount: number
  
  // Error actions
  handleError: (error: any, options?: { showToast?: boolean; context?: string }) => void
  clearError: () => void
  retry: (retryFn?: () => Promise<void> | void) => Promise<void>
  
  // Utilities
  canRetry: boolean
  isRetryable: (error?: any) => boolean
  getErrorSeverity: (error?: any) => 'error' | 'warning' | 'info'
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToast = true,
    logErrors = true,
    context = 'general'
  } = options

  const toast = useToast()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorMessage: null,
    retryCount: 0,
    lastErrorTime: null
  })

  // Check if an error is retryable
  const isRetryable = useCallback((error?: any): boolean => {
    const targetError = error || errorState.error
    if (!targetError) return false

    // Network errors are usually retryable
    if (targetError.name === 'TypeError' && targetError.message?.includes('fetch')) return true
    if (targetError.message && /network|connection|timeout/i.test(targetError.message)) return true
    
    // HTTP status codes that are retryable
    if (targetError.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504]
      return retryableStatuses.includes(targetError.status)
    }

    // Explicit retryable flag
    if (targetError.retryable !== undefined) return targetError.retryable

    return false
  }, [errorState.error])

  // Get error severity
  const getErrorSeverity = useCallback((error?: any): 'error' | 'warning' | 'info' => {
    const targetError = error || errorState.error
    if (!targetError) return 'error'

    // Network errors are warnings (temporary)
    if (isRetryable(targetError)) return 'warning'
    
    // Auth errors
    if (targetError.status === 401) return 'info' // Session expired
    if (targetError.status === 403) return 'warning' // Permission denied
    
    // Validation errors
    if (targetError.status === 422 || targetError.status === 400) return 'warning'
    
    // Server errors
    if (targetError.status >= 500) return 'error'
    
    return 'error'
  }, [errorState.error, isRetryable])

  // Handle error
  const handleError = useCallback((error: any, errorOptions: { showToast?: boolean; context?: string } = {}) => {
    const errorContext = errorOptions.context || context
    const shouldShowToast = errorOptions.showToast !== undefined ? errorOptions.showToast : showToast

    // Log error if enabled
    if (logErrors) {
      console.error('Error handled by useErrorHandler:', error)
      
      // Report to error tracking service
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: {
            errorHandler: 'useErrorHandler',
            context: errorContext
          }
        })
      }
    }

    // Get user-friendly error message
    const errorMessage = getContextualErrorMessage(error, errorContext as any)

    // Update error state
    setErrorState(prev => ({
      error,
      isError: true,
      errorMessage,
      retryCount: prev.error === error ? prev.retryCount : 0, // Reset retry count for new errors
      lastErrorTime: Date.now()
    }))

    // Show toast notification if enabled
    if (shouldShowToast) {
      const severity = getErrorSeverity(error)
      if (severity === 'error') {
        toast.error(errorMessage.title, errorMessage.message)
      } else if (severity === 'warning') {
        toast.info(errorMessage.title, errorMessage.message)
      } else {
        toast.info(errorMessage.title, errorMessage.message)
      }
    }
  }, [context, showToast, logErrors, toast, getErrorSeverity])

  // Clear error
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    
    setErrorState({
      error: null,
      isError: false,
      errorMessage: null,
      retryCount: 0,
      lastErrorTime: null
    })
  }, [])

  // Retry function
  const retry = useCallback(async (retryFn?: () => Promise<void> | void) => {
    if (!errorState.isError || errorState.retryCount >= maxRetries) {
      return
    }

    try {
      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(2, errorState.retryCount)
      
      // Wait for delay
      await new Promise(resolve => {
        retryTimeoutRef.current = setTimeout(resolve, delay)
      })

      // Update retry count
      setErrorState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1
      }))

      // Execute retry function if provided
      if (retryFn) {
        await retryFn()
      }

      // Clear error on successful retry
      clearError()
    } catch (retryError) {
      // Handle retry failure
      handleError(retryError, { showToast: false })
    }
  }, [errorState.isError, errorState.retryCount, maxRetries, retryDelay, clearError, handleError])

  // Check if retry is possible
  const canRetry = errorState.isError && 
                   isRetryable(errorState.error) && 
                   errorState.retryCount < maxRetries

  return {
    // Error state
    error: errorState.error,
    isError: errorState.isError,
    errorMessage: errorState.errorMessage,
    retryCount: errorState.retryCount,
    
    // Error actions
    handleError,
    clearError,
    retry,
    
    // Utilities
    canRetry,
    isRetryable,
    getErrorSeverity
  }
}

/**
 * Hook for handling async operations with error management
 */
interface UseAsyncErrorOptions extends UseErrorHandlerOptions {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

export function useAsyncError<T = any>(
  asyncFn: () => Promise<T>,
  options: UseAsyncErrorOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<T | null>(null)
  
  const errorHandler = useErrorHandler(options)

  const execute = useCallback(async () => {
    setIsLoading(true)
    errorHandler.clearError()

    try {
      const result = await asyncFn()
      setData(result)
      
      if (options.onSuccess) {
        options.onSuccess(result)
      }
      
      return result
    } catch (error) {
      errorHandler.handleError(error)
      
      if (options.onError) {
        options.onError(error)
      }
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [asyncFn, errorHandler, options])

  const retryExecution = useCallback(async () => {
    await errorHandler.retry(execute)
  }, [errorHandler, execute])

  return {
    // Async state
    isLoading,
    data,
    
    // Error state and actions
    ...errorHandler,
    
    // Execution
    execute,
    retry: retryExecution
  }
}

/**
 * Hook for handling form errors
 */
export function useFormError() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const errorHandler = useErrorHandler({ context: 'general', showToast: false })

  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }))
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({})
  }, [])

  const handleFormError = useCallback((error: any) => {
    // Handle validation errors with field-specific messages
    if (error.status === 422 && error.error?.details) {
      const newFieldErrors: Record<string, string> = {}
      
      error.error.details.forEach((detail: any) => {
        if (detail.field) {
          newFieldErrors[detail.field] = detail.message
        }
      })
      
      setFieldErrors(newFieldErrors)
    } else {
      // Handle general form errors
      errorHandler.handleError(error, { showToast: true })
    }
  }, [errorHandler])

  return {
    // Field errors
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
    
    // General error handling
    ...errorHandler,
    handleError: handleFormError
  }
}
