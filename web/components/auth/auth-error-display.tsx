/**
 * Auth Error Display Component
 * 
 * Displays authentication errors with retry options and user-friendly messages.
 * Integrates with the enhanced auth context and retry mechanisms.
 * 
 * @example
 * <AuthErrorDisplay />
 */

import React from 'react'
import { useAuthError } from '../../lib/auth-context'
import { getAuthErrorMessageFromError, categorizeAuthError } from '../../lib/auth-error-messages'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  Loader2, RefreshCw, AlertTriangle, Wifi, Clock, Shield,
  ShieldAlert, Lock, Timer, Wrench, Key, Smartphone, Mail,
  Server, ShieldX, WifiOff
} from 'lucide-react'

interface AuthErrorDisplayProps {
  className?: string
  showRetryButton?: boolean
  showDismissButton?: boolean
  compact?: boolean
}

export function AuthErrorDisplay({
  className = '',
  showRetryButton = true,
  showDismissButton = true,
  compact = false
}: AuthErrorDisplayProps) {
  const {
    authError,
    isRetrying,
    canRetry,
    retryAuth,
    clearError,
    hasError,
    user,
    isStaff
  } = useAuthError()

  if (!hasError || !authError) {
    return null
  }

  // Get user-friendly error message
  const errorMessage = getAuthErrorMessageFromError(authError, {
    userRole: user?.role,
    isStaff,
    currentPage: typeof window !== 'undefined' ? window.location.pathname : undefined
  })

  const getErrorIcon = () => {
    if (isRetrying) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }

    const iconMap = {
      'wifi-off': WifiOff,
      'clock': Clock,
      'server': Server,
      'shield': Shield,
      'shield-alert': ShieldAlert,
      'shield-x': ShieldX,
      'lock': Lock,
      'timer': Timer,
      'wrench': Wrench,
      'key': Key,
      'refresh-cw': RefreshCw,
      'smartphone': Smartphone,
      'mail': Mail,
      'alert-triangle': AlertTriangle
    }

    const IconComponent = iconMap[errorMessage.icon as keyof typeof iconMap] || AlertTriangle
    return <IconComponent className="h-4 w-4" />
  }

  const getAlertVariant = () => {
    switch (errorMessage.severity) {
      case 'error':
        return 'destructive'
      case 'warning':
        return 'default'
      case 'info':
        return 'default'
      default:
        return 'default'
    }
  }

  const handleRetry = async () => {
    try {
      await retryAuth()
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        {getErrorIcon()}
        <span className="text-muted-foreground">{errorMessage.title}</span>
        {errorMessage.retryable && canRetry && showRetryButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="h-6 px-2"
          >
            {isRetrying ? 'Retrying...' : errorMessage.action}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Alert variant={getAlertVariant()} className={className}>
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1 min-w-0">
          <AlertTitle className="mb-2">{errorMessage.title}</AlertTitle>
          <AlertDescription className="mb-3">
            {errorMessage.description}
          </AlertDescription>

          {errorMessage.troubleshooting && errorMessage.troubleshooting.length > 0 && (
            <details className="mb-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Troubleshooting steps
              </summary>
              <ul className="mt-2 text-sm text-muted-foreground space-y-1 ml-4">
                {errorMessage.troubleshooting.map((step, index) => (
                  <li key={index} className="list-disc">{step}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex gap-2">
            {errorMessage.retryable && canRetry && showRetryButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="h-8"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {errorMessage.action}
                  </>
                )}
              </Button>
            )}

            {errorMessage.helpUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = errorMessage.helpUrl!}
                className="h-8"
              >
                Get Help
              </Button>
            )}

            {showDismissButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="h-8"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  )
}

/**
 * Auth Status Indicator
 * 
 * Shows current auth status with retry information.
 * Useful for debugging and development.
 */
export function AuthStatusIndicator() {
  const { 
    isAuthenticated, 
    loading, 
    authError, 
    isRetrying, 
    retryCount 
  } = useAuthError()

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking authentication...
      </div>
    )
  }

  if (authError) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-red-600">
          Auth Error {retryCount > 0 && `(${retryCount} retries)`}
        </span>
        {isRetrying && (
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        )}
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        Authenticated
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="w-2 h-2 rounded-full bg-gray-400" />
      Not authenticated
    </div>
  )
}

/**
 * Network Status Indicator
 * 
 * Shows network connectivity status for auth operations.
 */
export function NetworkStatusIndicator() {
  const { authError } = useAuthError()
  const isNetworkError = authError?.type === 'network'

  if (!isNetworkError) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm text-orange-600">
      <Wifi className="h-3 w-3" />
      Network issues detected
    </div>
  )
}
