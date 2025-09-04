/**
 * User-friendly error display components
 * 
 * Provides consistent, accessible error display with appropriate
 * styling and actions based on error severity and type.
 */

import React from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, ExternalLink, RefreshCw } from 'lucide-react'
import { getErrorMessage, getContextualErrorMessage, type ErrorMessage } from '../../lib/error-messages'

interface ErrorDisplayProps {
  error: any
  context?: 'login' | 'signup' | 'profile' | 'checkout' | 'general'
  variant?: 'banner' | 'card' | 'inline' | 'modal'
  showDismiss?: boolean
  showRetry?: boolean
  showHelp?: boolean
  onDismiss?: () => void
  onRetry?: () => void
  className?: string
}

export function ErrorDisplay({
  error,
  context = 'general',
  variant = 'card',
  showDismiss = false,
  showRetry = false,
  showHelp = true,
  onDismiss,
  onRetry,
  className = ''
}: ErrorDisplayProps) {
  const errorMessage = getContextualErrorMessage(error, context)

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'error':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          title: 'text-red-900',
          message: 'text-red-700',
          button: 'bg-red-100 text-red-800 hover:bg-red-200'
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          title: 'text-yellow-900',
          message: 'text-yellow-700',
          button: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
        }
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          title: 'text-blue-900',
          message: 'text-blue-700',
          button: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        }
      default:
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          title: 'text-red-900',
          message: 'text-red-700',
          button: 'bg-red-100 text-red-800 hover:bg-red-200'
        }
    }
  }

  const styles = getSeverityStyles(errorMessage.severity)

  const renderBanner = () => (
    <div className={`border-l-4 p-4 ${styles.container} ${className}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          {getSeverityIcon(errorMessage.severity)}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {errorMessage.title}
          </h3>
          <div className={`mt-2 text-sm ${styles.message}`}>
            <p>{errorMessage.message}</p>
            {errorMessage.action && (
              <p className="mt-2 font-medium">{errorMessage.action}</p>
            )}
          </div>
          {renderActions()}
        </div>
        {showDismiss && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600`}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderCard = () => (
    <div className={`rounded-md border p-4 ${styles.container} ${className}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          {getSeverityIcon(errorMessage.severity)}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {errorMessage.title}
          </h3>
          <div className={`mt-2 text-sm ${styles.message}`}>
            <p>{errorMessage.message}</p>
            {errorMessage.action && (
              <p className="mt-2 font-medium">{errorMessage.action}</p>
            )}
          </div>
          {renderSuggestions()}
          {renderActions()}
        </div>
        {showDismiss && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderInline = () => (
    <div className={`flex items-start space-x-2 text-sm ${className}`} role="alert">
      <div className="flex-shrink-0 mt-0.5">
        {getSeverityIcon(errorMessage.severity)}
      </div>
      <div className="flex-1">
        <span className={`font-medium ${styles.title}`}>{errorMessage.title}:</span>
        <span className={`ml-1 ${styles.message}`}>{errorMessage.message}</span>
        {errorMessage.action && (
          <div className={`mt-1 ${styles.message}`}>{errorMessage.action}</div>
        )}
      </div>
    </div>
  )

  const renderModal = () => (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              errorMessage.severity === 'error' ? 'bg-red-100' :
              errorMessage.severity === 'warning' ? 'bg-yellow-100' :
              'bg-blue-100'
            }`}>
              {getSeverityIcon(errorMessage.severity)}
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {errorMessage.title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {errorMessage.message}
                </p>
                {errorMessage.action && (
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    {errorMessage.action}
                  </p>
                )}
              </div>
              {renderSuggestions()}
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            {renderActions(true)}
            {showDismiss && onDismiss && (
              <button
                onClick={onDismiss}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderSuggestions = () => {
    if (!errorMessage.suggestions || errorMessage.suggestions.length === 0) {
      return null
    }

    return (
      <div className="mt-3">
        <p className={`text-xs font-medium ${styles.title} mb-1`}>Suggestions:</p>
        <ul className={`text-xs ${styles.message} space-y-1`}>
          {errorMessage.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const renderActions = (isModal = false) => {
    const hasActions = showRetry || showHelp || errorMessage.helpUrl
    if (!hasActions) return null

    const buttonBaseClass = isModal
      ? "inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm"
      : "inline-flex items-center px-2 py-1 rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2"

    return (
      <div className={`${isModal ? 'sm:flex sm:flex-row-reverse' : 'mt-3 flex space-x-2'}`}>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className={`${buttonBaseClass} ${
              isModal
                ? 'bg-maroon-600 text-white hover:bg-maroon-700 focus:ring-maroon-500 sm:ml-3 sm:w-auto'
                : `${styles.button} focus:ring-offset-2`
            }`}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Try Again
          </button>
        )}
        
        {showHelp && errorMessage.helpUrl && (
          <a
            href={errorMessage.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonBaseClass} ${
              isModal
                ? 'bg-white border-gray-300 text-gray-700 hover:text-gray-500 focus:ring-gray-500'
                : `${styles.button} focus:ring-offset-2`
            }`}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Get Help
          </a>
        )}
      </div>
    )
  }

  switch (variant) {
    case 'banner':
      return renderBanner()
    case 'inline':
      return renderInline()
    case 'modal':
      return renderModal()
    case 'card':
    default:
      return renderCard()
  }
}

// Specialized error display components
export function AuthErrorDisplay({ error, onRetry, onDismiss, ...props }: Omit<ErrorDisplayProps, 'context'>) {
  return (
    <ErrorDisplay
      error={error}
      context="login"
      showRetry={!!onRetry}
      showDismiss={!!onDismiss}
      onRetry={onRetry}
      onDismiss={onDismiss}
      {...props}
    />
  )
}

export function ValidationErrorDisplay({ error, ...props }: Omit<ErrorDisplayProps, 'context' | 'variant'>) {
  return (
    <ErrorDisplay
      error={error}
      context="general"
      variant="inline"
      {...props}
    />
  )
}

export function NetworkErrorDisplay({ error, onRetry, ...props }: Omit<ErrorDisplayProps, 'context'>) {
  return (
    <ErrorDisplay
      error={error}
      context="general"
      showRetry={!!onRetry}
      onRetry={onRetry}
      {...props}
    />
  )
}
