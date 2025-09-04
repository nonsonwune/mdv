/**
 * User-friendly error messages for authentication and general errors
 * 
 * Provides consistent, helpful error messages across the application
 * with appropriate tone and actionable guidance for users.
 */

export interface ErrorMessage {
  title: string
  message: string
  action?: string
  severity: 'error' | 'warning' | 'info'
  category: 'auth' | 'network' | 'validation' | 'permission' | 'system'
  code?: string
  helpUrl?: string
  suggestions?: string[]
}

// Authentication error messages
export const AUTH_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Login errors
  INVALID_CREDENTIALS: {
    title: 'Sign in failed',
    message: 'The email or password you entered is incorrect. Please check your credentials and try again.',
    action: 'Double-check your email and password, then try signing in again.',
    severity: 'error',
    category: 'auth',
    code: 'AUTH_001',
    suggestions: [
      'Make sure Caps Lock is off',
      'Check for typos in your email address',
      'Try resetting your password if you\'ve forgotten it'
    ]
  },

  ACCOUNT_LOCKED: {
    title: 'Account temporarily locked',
    message: 'Your account has been temporarily locked due to multiple failed sign-in attempts.',
    action: 'Please wait 15 minutes before trying again, or contact support for immediate assistance.',
    severity: 'warning',
    category: 'auth',
    code: 'AUTH_002',
    helpUrl: '/help/account-locked',
    suggestions: [
      'Wait 15 minutes before trying again',
      'Contact support if you need immediate access',
      'Consider resetting your password'
    ]
  },

  ACCOUNT_DISABLED: {
    title: 'Account disabled',
    message: 'Your account has been disabled. Please contact your administrator for assistance.',
    action: 'Contact your administrator or support team to reactivate your account.',
    severity: 'error',
    category: 'auth',
    code: 'AUTH_003',
    helpUrl: '/help/account-disabled'
  },

  SESSION_EXPIRED: {
    title: 'Session expired',
    message: 'Your session has expired for security reasons. Please sign in again to continue.',
    action: 'Sign in again to access your account.',
    severity: 'info',
    category: 'auth',
    code: 'AUTH_004'
  },

  TOKEN_INVALID: {
    title: 'Authentication error',
    message: 'There was a problem with your authentication. Please sign in again.',
    action: 'Sign in again to continue.',
    severity: 'error',
    category: 'auth',
    code: 'AUTH_005'
  },

  PASSWORD_EXPIRED: {
    title: 'Password expired',
    message: 'Your password has expired and needs to be updated for security.',
    action: 'Please create a new password to continue.',
    severity: 'warning',
    category: 'auth',
    code: 'AUTH_006',
    helpUrl: '/help/password-requirements'
  },

  TWO_FACTOR_REQUIRED: {
    title: 'Two-factor authentication required',
    message: 'Please enter your two-factor authentication code to complete sign in.',
    action: 'Check your authenticator app or SMS for the verification code.',
    severity: 'info',
    category: 'auth',
    code: 'AUTH_007'
  },

  TWO_FACTOR_INVALID: {
    title: 'Invalid verification code',
    message: 'The verification code you entered is incorrect or has expired.',
    action: 'Please enter the current code from your authenticator app.',
    severity: 'error',
    category: 'auth',
    code: 'AUTH_008',
    suggestions: [
      'Make sure you\'re using the latest code',
      'Check that your device time is correct',
      'Try generating a new code'
    ]
  },

  // Permission errors
  INSUFFICIENT_PERMISSIONS: {
    title: 'Access denied',
    message: 'You don\'t have permission to access this resource.',
    action: 'Contact your administrator if you believe you should have access.',
    severity: 'warning',
    category: 'permission',
    code: 'PERM_001'
  },

  ROLE_REQUIRED: {
    title: 'Insufficient privileges',
    message: 'This action requires elevated privileges that your account doesn\'t have.',
    action: 'Contact your administrator to request the necessary permissions.',
    severity: 'warning',
    category: 'permission',
    code: 'PERM_002'
  }
}

// Network error messages
export const NETWORK_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  CONNECTION_FAILED: {
    title: 'Connection failed',
    message: 'Unable to connect to the server. Please check your internet connection.',
    action: 'Check your internet connection and try again.',
    severity: 'error',
    category: 'network',
    code: 'NET_001',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Contact support if the problem persists'
    ]
  },

  REQUEST_TIMEOUT: {
    title: 'Request timeout',
    message: 'The request took too long to complete. This might be due to a slow connection.',
    action: 'Please try again. If the problem persists, check your internet connection.',
    severity: 'warning',
    category: 'network',
    code: 'NET_002'
  },

  SERVER_UNAVAILABLE: {
    title: 'Service temporarily unavailable',
    message: 'The service is temporarily unavailable. We\'re working to restore it.',
    action: 'Please try again in a few minutes.',
    severity: 'warning',
    category: 'network',
    code: 'NET_003'
  },

  RATE_LIMITED: {
    title: 'Too many requests',
    message: 'You\'re making requests too quickly. Please slow down and try again.',
    action: 'Wait a moment before trying again.',
    severity: 'warning',
    category: 'network',
    code: 'NET_004'
  }
}

// Validation error messages
export const VALIDATION_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  REQUIRED_FIELD: {
    title: 'Required field missing',
    message: 'Please fill in all required fields.',
    action: 'Complete the required fields and try again.',
    severity: 'error',
    category: 'validation',
    code: 'VAL_001'
  },

  INVALID_EMAIL: {
    title: 'Invalid email address',
    message: 'Please enter a valid email address.',
    action: 'Check your email format and try again.',
    severity: 'error',
    category: 'validation',
    code: 'VAL_002',
    suggestions: [
      'Make sure your email includes @ and a domain',
      'Check for typos in your email address',
      'Use a standard email format like user@example.com'
    ]
  },

  WEAK_PASSWORD: {
    title: 'Password too weak',
    message: 'Your password doesn\'t meet the security requirements.',
    action: 'Create a stronger password with the required criteria.',
    severity: 'error',
    category: 'validation',
    code: 'VAL_003',
    helpUrl: '/help/password-requirements',
    suggestions: [
      'Use at least 8 characters',
      'Include uppercase and lowercase letters',
      'Add numbers and special characters',
      'Avoid common words or patterns'
    ]
  },

  PASSWORDS_DONT_MATCH: {
    title: 'Passwords don\'t match',
    message: 'The passwords you entered don\'t match.',
    action: 'Make sure both password fields contain the same password.',
    severity: 'error',
    category: 'validation',
    code: 'VAL_004'
  }
}

// System error messages
export const SYSTEM_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  INTERNAL_ERROR: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Our team has been notified.',
    action: 'Please try again. If the problem persists, contact support.',
    severity: 'error',
    category: 'system',
    code: 'SYS_001'
  },

  MAINTENANCE_MODE: {
    title: 'Maintenance in progress',
    message: 'The system is currently undergoing maintenance.',
    action: 'Please try again later. We apologize for the inconvenience.',
    severity: 'info',
    category: 'system',
    code: 'SYS_002'
  },

  FEATURE_UNAVAILABLE: {
    title: 'Feature unavailable',
    message: 'This feature is currently unavailable.',
    action: 'Please try again later or contact support for assistance.',
    severity: 'warning',
    category: 'system',
    code: 'SYS_003'
  }
}

// Combine all error messages
export const ALL_ERROR_MESSAGES = {
  ...AUTH_ERROR_MESSAGES,
  ...NETWORK_ERROR_MESSAGES,
  ...VALIDATION_ERROR_MESSAGES,
  ...SYSTEM_ERROR_MESSAGES
}

/**
 * Get user-friendly error message by code or error object
 */
export function getErrorMessage(
  errorCodeOrError: string | Error | any,
  fallbackMessage?: string
): ErrorMessage {
  let errorCode: string | undefined

  // Extract error code from different error formats
  if (typeof errorCodeOrError === 'string') {
    errorCode = errorCodeOrError
  } else if (errorCodeOrError?.code) {
    errorCode = errorCodeOrError.code
  } else if (errorCodeOrError?.error?.code) {
    errorCode = errorCodeOrError.error.code
  } else if (errorCodeOrError?.message) {
    // Try to extract code from message
    const codeMatch = errorCodeOrError.message.match(/\[([A-Z_]+\d+)\]/)
    if (codeMatch) {
      errorCode = codeMatch[1]
    }
  }

  // Get predefined error message
  if (errorCode && ALL_ERROR_MESSAGES[errorCode]) {
    return ALL_ERROR_MESSAGES[errorCode]
  }

  // Handle HTTP status codes
  if (errorCodeOrError?.status) {
    const status = errorCodeOrError.status
    if (status === 401) return AUTH_ERROR_MESSAGES.SESSION_EXPIRED
    if (status === 403) return AUTH_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
    if (status === 429) return NETWORK_ERROR_MESSAGES.RATE_LIMITED
    if (status >= 500) return NETWORK_ERROR_MESSAGES.SERVER_UNAVAILABLE
    if (status >= 400) return VALIDATION_ERROR_MESSAGES.REQUIRED_FIELD
  }

  // Handle network errors
  if (errorCodeOrError?.name === 'TypeError' && errorCodeOrError?.message?.includes('fetch')) {
    return NETWORK_ERROR_MESSAGES.CONNECTION_FAILED
  }

  // Fallback error message
  return {
    title: 'Error',
    message: fallbackMessage || errorCodeOrError?.message || 'An unexpected error occurred.',
    action: 'Please try again or contact support if the problem persists.',
    severity: 'error',
    category: 'system',
    code: 'UNKNOWN'
  }
}

/**
 * Get contextual error message based on user action
 */
export function getContextualErrorMessage(
  error: any,
  context: 'login' | 'signup' | 'profile' | 'checkout' | 'general'
): ErrorMessage {
  const baseMessage = getErrorMessage(error)

  // Customize message based on context
  switch (context) {
    case 'login':
      if (baseMessage.category === 'auth') {
        return {
          ...baseMessage,
          action: baseMessage.action || 'Please check your credentials and try signing in again.'
        }
      }
      break

    case 'signup':
      if (baseMessage.category === 'validation') {
        return {
          ...baseMessage,
          action: baseMessage.action || 'Please correct the highlighted fields and try again.'
        }
      }
      break

    case 'checkout':
      if (baseMessage.category === 'network') {
        return {
          ...baseMessage,
          message: 'There was a problem processing your order. Your payment has not been charged.',
          action: 'Please try again or contact support for assistance.'
        }
      }
      break
  }

  return baseMessage
}

/**
 * Format error message for display
 */
export function formatErrorMessage(errorMessage: ErrorMessage): {
  title: string
  message: string
  action?: string
  severity: string
  suggestions?: string[]
} {
  return {
    title: errorMessage.title,
    message: errorMessage.message,
    action: errorMessage.action,
    severity: errorMessage.severity,
    suggestions: errorMessage.suggestions
  }
}
