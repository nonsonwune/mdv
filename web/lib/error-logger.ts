/**
 * Comprehensive Error Logging System
 * 
 * Provides structured error logging with multiple transport options,
 * error categorization, and performance monitoring integration.
 */

interface ErrorContext {
  userId?: string
  sessionId?: string
  userAgent?: string
  url?: string
  timestamp?: number
  buildVersion?: string
  environment?: string
  feature?: string
  action?: string
  metadata?: Record<string, any>
}

interface ErrorLogEntry {
  id: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  error?: Error
  context: ErrorContext
  stack?: string
  fingerprint?: string
  tags?: string[]
  breadcrumbs?: Breadcrumb[]
  performance?: PerformanceMetrics
}

interface Breadcrumb {
  timestamp: number
  category: 'navigation' | 'user' | 'http' | 'console' | 'error'
  message: string
  level: 'info' | 'warning' | 'error'
  data?: Record<string, any>
}

interface PerformanceMetrics {
  loadTime?: number
  renderTime?: number
  memoryUsage?: number
  networkLatency?: number
  errorRate?: number
}

interface LoggerTransport {
  name: string
  log: (entry: ErrorLogEntry) => Promise<void> | void
  isEnabled: () => boolean
}

class ErrorLogger {
  private transports: LoggerTransport[] = []
  private breadcrumbs: Breadcrumb[] = []
  private context: ErrorContext = {}
  private maxBreadcrumbs = 50
  private isEnabled = true

  constructor() {
    this.initializeContext()
    this.setupGlobalErrorHandlers()
  }

  private initializeContext() {
    if (typeof window !== 'undefined') {
      this.context = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        sessionId: this.generateSessionId()
      }
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return

    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError('Unhandled JavaScript Error', event.error, {
        feature: 'global',
        action: 'unhandled_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason, {
        feature: 'global',
        action: 'unhandled_rejection'
      })
    })

    // Network errors
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        
        // Log slow requests
        const duration = endTime - startTime
        if (duration > 5000) {
          this.logWarning('Slow Network Request', {
            feature: 'network',
            action: 'slow_request',
            metadata: {
              url: args[0],
              duration,
              status: response.status
            }
          })
        }

        // Log HTTP errors
        if (!response.ok) {
          this.logError('HTTP Error', new Error(`HTTP ${response.status}: ${response.statusText}`), {
            feature: 'network',
            action: 'http_error',
            metadata: {
              url: args[0],
              status: response.status,
              statusText: response.statusText
            }
          })
        }

        return response
      } catch (error) {
        const endTime = performance.now()
        this.logError('Network Request Failed', error as Error, {
          feature: 'network',
          action: 'request_failed',
          metadata: {
            url: args[0],
            duration: endTime - startTime
          }
        })
        throw error
      }
    }
  }

  addTransport(transport: LoggerTransport) {
    this.transports.push(transport)
  }

  removeTransport(name: string) {
    this.transports = this.transports.filter(t => t.name !== name)
  }

  setContext(context: Partial<ErrorContext>) {
    this.context = { ...this.context, ...context }
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: Date.now()
    })

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs)
    }
  }

  private async log(entry: Omit<ErrorLogEntry, 'id' | 'context' | 'breadcrumbs'>) {
    if (!this.isEnabled) return

    const logEntry: ErrorLogEntry = {
      ...entry,
      id: this.generateLogId(),
      context: { ...this.context, timestamp: Date.now() },
      breadcrumbs: [...this.breadcrumbs],
      fingerprint: this.generateFingerprint(entry.message, entry.error),
      performance: this.getPerformanceMetrics()
    }

    // Send to all enabled transports
    const promises = this.transports
      .filter(transport => transport.isEnabled())
      .map(transport => {
        try {
          return Promise.resolve(transport.log(logEntry))
        } catch (error) {
          console.error(`Error in transport ${transport.name}:`, error)
          return Promise.resolve()
        }
      })

    await Promise.allSettled(promises)
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private generateFingerprint(message: string, error?: Error): string {
    const key = error?.stack || message
    return btoa(key).substring(0, 16)
  }

  private getPerformanceMetrics(): PerformanceMetrics | undefined {
    if (typeof window === 'undefined' || !window.performance) return undefined

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const memory = (performance as any).memory

    return {
      loadTime: navigation?.loadEventEnd - navigation?.loadEventStart,
      renderTime: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      memoryUsage: memory?.usedJSHeapSize,
      networkLatency: navigation?.responseStart - navigation?.requestStart
    }
  }

  logError(message: string, error?: Error, context?: Partial<ErrorContext>) {
    this.addBreadcrumb({
      category: 'error',
      message,
      level: 'error',
      data: context
    })

    return this.log({
      level: 'error',
      message,
      error,
      stack: error?.stack,
      tags: ['error'],
      ...context && { context: { ...this.context, ...context } }
    })
  }

  logWarning(message: string, context?: Partial<ErrorContext>) {
    this.addBreadcrumb({
      category: 'console',
      message,
      level: 'warning',
      data: context
    })

    return this.log({
      level: 'warn',
      message,
      tags: ['warning'],
      ...context && { context: { ...this.context, ...context } }
    })
  }

  logInfo(message: string, context?: Partial<ErrorContext>) {
    return this.log({
      level: 'info',
      message,
      tags: ['info'],
      ...context && { context: { ...this.context, ...context } }
    })
  }

  logDebug(message: string, context?: Partial<ErrorContext>) {
    if (process.env.NODE_ENV !== 'development') return

    return this.log({
      level: 'debug',
      message,
      tags: ['debug'],
      ...context && { context: { ...this.context, ...context } }
    })
  }

  // Authentication-specific logging
  logAuthError(error: any, action: string, context?: Record<string, any>) {
    return this.logError(`Authentication Error: ${action}`, error, {
      feature: 'authentication',
      action,
      metadata: context
    })
  }

  logAuthSuccess(action: string, context?: Record<string, any>) {
    return this.logInfo(`Authentication Success: ${action}`, {
      feature: 'authentication',
      action,
      metadata: context
    })
  }

  // User interaction logging
  logUserAction(action: string, element?: string, context?: Record<string, any>) {
    this.addBreadcrumb({
      category: 'user',
      message: `User ${action}${element ? ` on ${element}` : ''}`,
      level: 'info',
      data: { action, element, ...context }
    })

    return this.logInfo(`User Action: ${action}`, {
      feature: 'user_interaction',
      action,
      metadata: { element, ...context }
    })
  }

  // Navigation logging
  logNavigation(from: string, to: string, context?: Record<string, any>) {
    this.addBreadcrumb({
      category: 'navigation',
      message: `Navigation from ${from} to ${to}`,
      level: 'info',
      data: { from, to, ...context }
    })

    return this.logInfo(`Navigation: ${from} → ${to}`, {
      feature: 'navigation',
      action: 'route_change',
      metadata: { from, to, ...context }
    })
  }

  // Performance logging
  logPerformanceIssue(metric: string, value: number, threshold: number, context?: Record<string, any>) {
    return this.logWarning(`Performance Issue: ${metric}`, {
      feature: 'performance',
      action: 'threshold_exceeded',
      metadata: { metric, value, threshold, ...context }
    })
  }

  enable() {
    this.isEnabled = true
  }

  disable() {
    this.isEnabled = false
  }

  clearBreadcrumbs() {
    this.breadcrumbs = []
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs]
  }

  getContext(): ErrorContext {
    return { ...this.context }
  }
}

// Transport implementations
export const consoleTransport: LoggerTransport = {
  name: 'console',
  log: (entry) => {
    const method = entry.level === 'error' ? 'error' : 
                   entry.level === 'warn' ? 'warn' : 
                   entry.level === 'debug' ? 'debug' : 'log'
    
    console[method](`[${entry.level.toUpperCase()}] ${entry.message}`, {
      error: entry.error,
      context: entry.context,
      breadcrumbs: entry.breadcrumbs?.slice(-5) // Last 5 breadcrumbs
    })
  },
  isEnabled: () => process.env.NODE_ENV === 'development'
}

export const remoteTransport: LoggerTransport = {
  name: 'remote',
  log: async (entry) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      })
    } catch (error) {
      console.error('Failed to send log to remote:', error)
    }
  },
  isEnabled: () => process.env.NODE_ENV === 'production'
}

export const localStorageTransport: LoggerTransport = {
  name: 'localStorage',
  log: (entry) => {
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]')
      logs.push(entry)
      
      // Keep only last 100 logs
      const recentLogs = logs.slice(-100)
      localStorage.setItem('error_logs', JSON.stringify(recentLogs))
    } catch (error) {
      console.error('Failed to save log to localStorage:', error)
    }
  },
  isEnabled: () => typeof localStorage !== 'undefined'
}

// Global logger instance
export const logger = new ErrorLogger()

// Add default transports
logger.addTransport(consoleTransport)
logger.addTransport(remoteTransport)
logger.addTransport(localStorageTransport)

// Export for use in components and hooks
export default logger
