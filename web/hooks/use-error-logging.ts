/**
 * Error Logging Hook
 * 
 * Provides React integration for the error logging system
 * with automatic context tracking and component lifecycle integration.
 */

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import logger from '../lib/error-logger'

interface UseErrorLoggingOptions {
  feature?: string
  userId?: string
  trackNavigation?: boolean
  trackUserInteractions?: boolean
  trackPerformance?: boolean
  autoLogErrors?: boolean
}

interface UseErrorLoggingReturn {
  logError: (message: string, error?: Error, context?: Record<string, any>) => void
  logWarning: (message: string, context?: Record<string, any>) => void
  logInfo: (message: string, context?: Record<string, any>) => void
  logUserAction: (action: string, element?: string, context?: Record<string, any>) => void
  logAuthError: (error: any, action: string, context?: Record<string, any>) => void
  logAuthSuccess: (action: string, context?: Record<string, any>) => void
  logPerformanceIssue: (metric: string, value: number, threshold: number, context?: Record<string, any>) => void
  setContext: (context: Record<string, any>) => void
  addBreadcrumb: (message: string, category?: string, data?: Record<string, any>) => void
}

export function useErrorLogging(options: UseErrorLoggingOptions = {}): UseErrorLoggingReturn {
  const {
    feature,
    userId,
    trackNavigation = true,
    trackUserInteractions = false,
    trackPerformance = true,
    autoLogErrors = true
  } = options

  const router = useRouter()
  const previousPath = useRef<string>()
  const componentMountTime = useRef<number>(Date.now())

  // Set up component context
  useEffect(() => {
    const context = {
      feature,
      userId,
      component: 'unknown' // This could be enhanced to detect component name
    }

    logger.setContext(context)

    // Log component mount
    if (feature) {
      logger.logInfo(`Component mounted: ${feature}`, {
        feature,
        action: 'component_mount'
      })
    }

    return () => {
      // Log component unmount and duration
      if (feature) {
        const mountDuration = Date.now() - componentMountTime.current
        logger.logInfo(`Component unmounted: ${feature}`, {
          feature,
          action: 'component_unmount',
          metadata: { mountDuration }
        })
      }
    }
  }, [feature, userId])

  // Track navigation changes
  useEffect(() => {
    if (!trackNavigation) return

    const currentPath = window.location.pathname
    
    if (previousPath.current && previousPath.current !== currentPath) {
      logger.logNavigation(previousPath.current, currentPath, {
        feature,
        referrer: document.referrer
      })
    }
    
    previousPath.current = currentPath
  }, [router, trackNavigation, feature])

  // Track performance metrics
  useEffect(() => {
    if (!trackPerformance) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log long tasks (> 50ms)
        if (entry.entryType === 'longtask' && entry.duration > 50) {
          logger.logPerformanceIssue('long_task', entry.duration, 50, {
            feature,
            entryType: entry.entryType
          })
        }

        // Log large layout shifts
        if (entry.entryType === 'layout-shift' && (entry as any).value > 0.1) {
          logger.logPerformanceIssue('layout_shift', (entry as any).value, 0.1, {
            feature,
            entryType: entry.entryType
          })
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['longtask', 'layout-shift'] })
    } catch (e) {
      // Performance Observer not supported
    }

    return () => observer.disconnect()
  }, [trackPerformance, feature])

  // Set up automatic error logging
  useEffect(() => {
    if (!autoLogErrors) return

    const handleError = (event: ErrorEvent) => {
      logger.logError('Component Error', event.error, {
        feature,
        action: 'component_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.logError('Unhandled Promise Rejection', event.reason, {
        feature,
        action: 'promise_rejection'
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [autoLogErrors, feature])

  // Set up user interaction tracking
  useEffect(() => {
    if (!trackUserInteractions) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const elementInfo = {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        textContent: target.textContent?.substring(0, 50)
      }

      logger.logUserAction('click', target.tagName.toLowerCase(), {
        feature,
        element: elementInfo,
        coordinates: { x: event.clientX, y: event.clientY }
      })
    }

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement
      logger.logUserAction('form_submit', 'form', {
        feature,
        formId: form.id,
        formAction: form.action
      })
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('submit', handleSubmit)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('submit', handleSubmit)
    }
  }, [trackUserInteractions, feature])

  // Logging functions with feature context
  const logError = useCallback((message: string, error?: Error, context?: Record<string, any>) => {
    logger.logError(message, error, {
      feature,
      ...context
    })
  }, [feature])

  const logWarning = useCallback((message: string, context?: Record<string, any>) => {
    logger.logWarning(message, {
      feature,
      ...context
    })
  }, [feature])

  const logInfo = useCallback((message: string, context?: Record<string, any>) => {
    logger.logInfo(message, {
      feature,
      ...context
    })
  }, [feature])

  const logUserAction = useCallback((action: string, element?: string, context?: Record<string, any>) => {
    logger.logUserAction(action, element, {
      feature,
      ...context
    })
  }, [feature])

  const logAuthError = useCallback((error: any, action: string, context?: Record<string, any>) => {
    logger.logAuthError(error, action, {
      feature,
      ...context
    })
  }, [feature])

  const logAuthSuccess = useCallback((action: string, context?: Record<string, any>) => {
    logger.logAuthSuccess(action, {
      feature,
      ...context
    })
  }, [feature])

  const logPerformanceIssue = useCallback((metric: string, value: number, threshold: number, context?: Record<string, any>) => {
    logger.logPerformanceIssue(metric, value, threshold, {
      feature,
      ...context
    })
  }, [feature])

  const setContext = useCallback((context: Record<string, any>) => {
    logger.setContext({
      feature,
      ...context
    })
  }, [feature])

  const addBreadcrumb = useCallback((message: string, category = 'user', data?: Record<string, any>) => {
    logger.addBreadcrumb({
      category: category as any,
      message,
      level: 'info',
      data: {
        feature,
        ...data
      }
    })
  }, [feature])

  return {
    logError,
    logWarning,
    logInfo,
    logUserAction,
    logAuthError,
    logAuthSuccess,
    logPerformanceIssue,
    setContext,
    addBreadcrumb
  }
}

/**
 * Hook for logging authentication events
 */
export function useAuthLogging() {
  const logging = useErrorLogging({ feature: 'authentication' })

  const logLoginAttempt = useCallback((email: string) => {
    logging.addBreadcrumb(`Login attempt for ${email}`, 'user')
    logging.logInfo('Login attempt started', { action: 'login_attempt', email })
  }, [logging])

  const logLoginSuccess = useCallback((user: any) => {
    logging.logAuthSuccess('login', { 
      userId: user.id, 
      role: user.role,
      email: user.email 
    })
  }, [logging])

  const logLoginFailure = useCallback((error: any, email?: string) => {
    logging.logAuthError(error, 'login', { email })
  }, [logging])

  const logLogout = useCallback((reason: 'user' | 'session_expired' | 'error' = 'user') => {
    logging.logAuthSuccess('logout', { reason })
  }, [logging])

  const logSessionExpired = useCallback(() => {
    logging.logWarning('Session expired', { action: 'session_expired' })
  }, [logging])

  const logPasswordReset = useCallback((email: string) => {
    logging.logInfo('Password reset requested', { action: 'password_reset', email })
  }, [logging])

  return {
    logLoginAttempt,
    logLoginSuccess,
    logLoginFailure,
    logLogout,
    logSessionExpired,
    logPasswordReset,
    ...logging
  }
}

/**
 * Hook for logging form interactions
 */
export function useFormLogging(formName: string) {
  const logging = useErrorLogging({ feature: `form_${formName}` })

  const logFormStart = useCallback(() => {
    logging.addBreadcrumb(`Started filling ${formName} form`, 'user')
    logging.logInfo('Form interaction started', { action: 'form_start', formName })
  }, [logging, formName])

  const logFormSubmit = useCallback((data?: Record<string, any>) => {
    logging.logInfo('Form submitted', { 
      action: 'form_submit', 
      formName,
      fieldCount: data ? Object.keys(data).length : undefined
    })
  }, [logging, formName])

  const logFormError = useCallback((error: any, field?: string) => {
    logging.logError('Form validation error', error, { 
      action: 'form_error', 
      formName,
      field 
    })
  }, [logging, formName])

  const logFieldError = useCallback((field: string, error: string) => {
    logging.logWarning('Field validation error', { 
      action: 'field_error', 
      formName,
      field,
      error 
    })
  }, [logging, formName])

  return {
    logFormStart,
    logFormSubmit,
    logFormError,
    logFieldError,
    ...logging
  }
}
