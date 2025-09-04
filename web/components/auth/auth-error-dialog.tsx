/**
 * Auth Error Dialog Component
 * 
 * Comprehensive dialog for displaying detailed authentication error information
 * with troubleshooting steps, help links, and action buttons.
 * 
 * @example
 * <AuthErrorDialog 
 *   error={authError} 
 *   open={showErrorDialog} 
 *   onClose={() => setShowErrorDialog(false)}
 * />
 */

import React from 'react'
import { 
  getAuthErrorMessageFromError, 
  categorizeAuthError,
  type AuthErrorContext 
} from '../../lib/auth-error-messages'
import { useAuth } from '../../lib/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { 
  Loader2, RefreshCw, ExternalLink, Copy, CheckCircle,
  WifiOff, Clock, Server, Shield, ShieldAlert, ShieldX,
  Lock, Timer, Wrench, Key, Smartphone, Mail, AlertTriangle
} from 'lucide-react'

interface AuthErrorDialogProps {
  error: any
  open: boolean
  onClose: () => void
  onRetry?: () => Promise<void>
  context?: AuthErrorContext
  showTechnicalDetails?: boolean
}

export function AuthErrorDialog({
  error,
  open,
  onClose,
  onRetry,
  context,
  showTechnicalDetails = false
}: AuthErrorDialogProps) {
  const { user, isStaff } = useAuth()
  const [isRetrying, setIsRetrying] = React.useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = React.useState(false)

  // Get user-friendly error message
  const errorMessage = getAuthErrorMessageFromError(error, {
    userRole: user?.role,
    isStaff,
    currentPage: typeof window !== 'undefined' ? window.location.pathname : undefined,
    ...context
  })

  const getErrorIcon = () => {
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
    return <IconComponent className="h-6 w-6" />
  }

  const getSeverityColor = () => {
    switch (errorMessage.severity) {
      case 'error':
        return 'destructive'
      case 'warning':
        return 'secondary'
      case 'info':
        return 'default'
      default:
        return 'default'
    }
  }

  const handleRetry = async () => {
    if (!onRetry) return
    
    setIsRetrying(true)
    try {
      await onRetry()
      onClose()
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleCopyError = async () => {
    const errorDetails = {
      type: categorizeAuthError(error),
      message: error.message,
      status: error.status,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleGoToHelp = () => {
    if (errorMessage.helpUrl) {
      window.open(errorMessage.helpUrl, '_blank')
    }
  }

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Authentication Error: ${errorMessage.title}`)
    const body = encodeURIComponent(`
I'm experiencing an authentication error:

Error Type: ${categorizeAuthError(error)}
Error Message: ${errorMessage.description}
Page: ${window.location.href}
Time: ${new Date().toLocaleString()}

Please help me resolve this issue.
    `.trim())
    
    window.open(`mailto:support@mdv.com?subject=${subject}&body=${body}`)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getErrorIcon()}
            <div className="flex-1">
              <DialogTitle className="text-left">{errorMessage.title}</DialogTitle>
              <Badge variant={getSeverityColor()} className="mt-1">
                {errorMessage.severity.toUpperCase()}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-left">
            {errorMessage.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Troubleshooting Steps */}
          {errorMessage.troubleshooting && errorMessage.troubleshooting.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">What you can do:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {errorMessage.troubleshooting.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary font-medium">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical Details (for staff or debug mode) */}
          {showTechnicalDetails && (isStaff || process.env.NODE_ENV === 'development') && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Technical Details</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyError}
                    className="h-6 px-2"
                  >
                    {copiedToClipboard ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <Alert>
                  <AlertDescription className="text-xs font-mono">
                    <div>Type: {categorizeAuthError(error)}</div>
                    <div>Status: {error.status || 'N/A'}</div>
                    <div>Message: {error.message}</div>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">Stack trace</summary>
                        <pre className="mt-1 text-xs overflow-auto max-h-20">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Primary Action */}
          {errorMessage.retryable && onRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full sm:w-auto"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {errorMessage.action}
                </>
              )}
            </Button>
          )}

          {/* Help Action */}
          {errorMessage.helpUrl && (
            <Button
              variant="outline"
              onClick={handleGoToHelp}
              className="w-full sm:w-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Get Help
            </Button>
          )}

          {/* Contact Support */}
          <Button
            variant="outline"
            onClick={handleContactSupport}
            className="w-full sm:w-auto"
          >
            Contact Support
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook for managing auth error dialog state
 */
export function useAuthErrorDialog() {
  const [error, setError] = React.useState<any>(null)
  const [isOpen, setIsOpen] = React.useState(false)

  const showError = React.useCallback((error: any) => {
    setError(error)
    setIsOpen(true)
  }, [])

  const hideError = React.useCallback(() => {
    setIsOpen(false)
    // Clear error after animation completes
    setTimeout(() => setError(null), 200)
  }, [])

  return {
    error,
    isOpen,
    showError,
    hideError
  }
}

/**
 * Example usage:
 * 
 * const { error, isOpen, showError, hideError } = useAuthErrorDialog()
 * 
 * // Show error
 * try {
 *   await login(credentials)
 * } catch (error) {
 *   showError(error)
 * }
 * 
 * // Render dialog
 * <AuthErrorDialog
 *   error={error}
 *   open={isOpen}
 *   onClose={hideError}
 *   onRetry={() => login(credentials)}
 * />
 */
