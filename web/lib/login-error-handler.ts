/**
 * Shared login error handling utilities for consistent error management
 * across staff and customer login forms.
 */

export interface LoginError {
  type: 'validation' | 'authentication' | 'authorization' | 'network' | 'server' | 'rate_limit'
  message: string
  details?: string
  retryable?: boolean
  retryAfter?: number
}

export interface ValidationErrors {
  email?: string
  password?: string
}

/**
 * Validates login form inputs
 */
export const validateLoginForm = (email: string, password: string): ValidationErrors => {
  const errors: ValidationErrors = {}
  
  if (!email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  if (!password.trim()) {
    errors.password = 'Password is required'
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }
  
  return errors
}

/**
 * Parses API error response into standardized LoginError format
 */
export const parseApiError = async (response: Response): Promise<LoginError> => {
  try {
    const errorData = await response.json()
    
    // Handle standardized API error format
    if (errorData.error) {
      const apiError = errorData.error
      
      switch (apiError.code) {
        case 'AUTH_1001': // Invalid credentials
          return {
            type: 'authentication',
            message: 'Invalid email or password',
            details: 'Please check your credentials and try again.',
            retryable: true
          }
        case 'AUTH_1002': // Token expired
          return {
            type: 'authentication',
            message: 'Session expired',
            details: 'Your session has expired. Please sign in again.',
            retryable: true
          }
        case 'AUTH_1004': // Account disabled
          return {
            type: 'authorization',
            message: 'Account disabled',
            details: 'Your account has been disabled. Please contact support.',
            retryable: false
          }
        case 'AUTH_1005': // Password change required
          return {
            type: 'authentication',
            message: 'Password change required',
            details: 'You must change your password before continuing.',
            retryable: false
          }
        case 'AUTHZ_1101': // Insufficient permissions
          return {
            type: 'authorization',
            message: 'Access denied',
            details: 'You don\'t have permission to access this area.',
            retryable: false
          }
        case 'AUTHZ_1102': // Role not allowed
          return {
            type: 'authorization',
            message: 'Access denied',
            details: 'Your account type doesn\'t allow access to this area.',
            retryable: false
          }
        case 'VAL_1201': // Invalid input
        case 'VAL_1202': // Missing required field
          return {
            type: 'validation',
            message: 'Invalid input',
            details: apiError.message || 'Please check your input and try again.',
            retryable: true
          }
        case 'RATE_1601': // Rate limit exceeded
          return {
            type: 'rate_limit',
            message: 'Too many login attempts',
            details: 'Please wait before trying again.',
            retryable: true,
            retryAfter: apiError.metadata?.retry_after || 60
          }
        case 'INT_1701': // Internal server error
        case 'INT_1702': // Database error
          return {
            type: 'server',
            message: 'Server error',
            details: 'We\'re experiencing technical difficulties. Please try again later.',
            retryable: true
          }
        default:
          return {
            type: 'authentication',
            message: apiError.message || 'Login failed',
            details: apiError.details || 'Please try again.',
            retryable: true
          }
      }
    }
    
    // Fallback for non-standardized errors
    const errorText = errorData.detail || errorData.message || 'Login failed'
    return {
      type: 'authentication',
      message: errorText,
      retryable: true
    }
    
  } catch (parseError) {
    // If we can't parse the error, provide a generic message based on status code
    return {
      type: response.status >= 500 ? 'server' : 'authentication',
      message: response.status >= 500 ? 'Server error' : 'Login failed',
      details: response.status >= 500 ? 'Please try again later.' : 'Please check your credentials.',
      retryable: true
    }
  }
}

/**
 * Handles URL error parameters and converts them to LoginError format
 */
export const parseUrlError = (urlError: string | null): LoginError | null => {
  if (!urlError) return null
  
  switch (urlError) {
    case 'insufficient_permissions':
      return {
        type: 'authorization',
        message: 'Access denied',
        details: 'Your account does not have the required permissions.',
        retryable: false
      }
    case 'authentication_required':
      return {
        type: 'authentication',
        message: 'Please sign in to continue',
        details: 'Authentication is required to access this page.',
        retryable: true
      }
    case 'session_expired':
      return {
        type: 'authentication',
        message: 'Your session has expired',
        details: 'For security reasons, you need to sign in again.',
        retryable: true
      }
    case 'account_locked':
      return {
        type: 'authorization',
        message: 'Account temporarily locked',
        details: 'Your account has been temporarily locked due to multiple failed login attempts.',
        retryable: true,
        retryAfter: 300 // 5 minutes
      }
    case 'maintenance':
      return {
        type: 'server',
        message: 'System maintenance',
        details: 'The system is currently under maintenance. Please try again later.',
        retryable: true
      }
    default:
      return {
        type: 'authentication',
        message: 'Authentication error',
        details: 'Please try signing in again.',
        retryable: true
      }
  }
}

/**
 * Generates user-friendly error messages with helpful suggestions
 */
export const getErrorSuggestions = (error: LoginError, retryCount: number): string[] => {
  const suggestions: string[] = []
  
  if (error.type === 'authentication' && retryCount >= 2) {
    suggestions.push('Double-check your email and password')
    suggestions.push('Make sure Caps Lock is off')
    suggestions.push('Try copying and pasting your password')
  }
  
  if (error.type === 'network') {
    suggestions.push('Check your internet connection')
    suggestions.push('Try refreshing the page')
    suggestions.push('Disable any VPN or proxy')
  }
  
  if (error.type === 'server') {
    suggestions.push('Wait a few minutes and try again')
    suggestions.push('Check our status page for known issues')
    suggestions.push('Contact support if the problem persists')
  }
  
  if (error.type === 'rate_limit') {
    suggestions.push('Wait before trying again')
    suggestions.push('Avoid rapid repeated attempts')
  }
  
  if (retryCount >= 3) {
    suggestions.push('Clear your browser cache and cookies')
    suggestions.push('Try using a different browser')
    suggestions.push('Contact support for assistance')
  }
  
  return suggestions
}

/**
 * Determines if a login attempt should be rate limited
 */
export const shouldRateLimit = (lastAttemptTime: number | null, minInterval: number = 1000): boolean => {
  if (!lastAttemptTime) return false
  return Date.now() - lastAttemptTime < minInterval
}

/**
 * Creates a rate limit error
 */
export const createRateLimitError = (retryAfter: number = 1): LoginError => ({
  type: 'rate_limit',
  message: 'Please wait before trying again',
  details: 'You are making requests too quickly.',
  retryable: true,
  retryAfter
})

/**
 * Creates a network error
 */
export const createNetworkError = (): LoginError => ({
  type: 'network',
  message: 'Connection failed',
  details: 'Please check your internet connection and try again.',
  retryable: true
})

/**
 * Checks if an error is retryable after a certain time
 */
export const isRetryableAfterTime = (error: LoginError, lastAttemptTime: number | null): boolean => {
  if (!error.retryable || !error.retryAfter || !lastAttemptTime) return error.retryable || false
  return Date.now() - lastAttemptTime >= (error.retryAfter * 1000)
}
