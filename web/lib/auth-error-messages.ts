/**
 * Auth Error Messages
 * 
 * Centralized system for user-friendly authentication error messages.
 * Provides clear, actionable messages for different auth failure scenarios.
 * 
 * @example
 * const message = getAuthErrorMessage('expired_session', { userRole: 'customer' })
 * console.log(message.title) // "Session Expired"
 * console.log(message.description) // "Your session has expired..."
 * console.log(message.action) // "Please log in again"
 */

export interface AuthErrorMessage {
  title: string
  description: string
  action: string
  severity: 'error' | 'warning' | 'info'
  retryable: boolean
  icon?: string
  helpUrl?: string
  troubleshooting?: string[]
}

export type AuthErrorType = 
  | 'expired_session'
  | 'invalid_credentials'
  | 'network_error'
  | 'server_error'
  | 'permission_denied'
  | 'account_locked'
  | 'rate_limited'
  | 'maintenance_mode'
  | 'cors_error'
  | 'timeout'
  | 'invalid_token'
  | 'token_refresh_failed'
  | 'two_factor_required'
  | 'email_not_verified'
  | 'unknown_error'

export interface AuthErrorContext {
  userRole?: string
  isStaff?: boolean
  retryCount?: number
  lastSuccessfulLogin?: Date
  currentPage?: string
  userAgent?: string
}

const AUTH_ERROR_MESSAGES: Record<AuthErrorType, (context?: AuthErrorContext) => AuthErrorMessage> = {
  expired_session: (context) => ({
    title: 'Session Expired',
    description: context?.isStaff 
      ? 'Your staff session has expired for security reasons. Please log in again to continue managing the platform.'
      : 'Your session has expired. Please log in again to continue shopping.',
    action: 'Log in again',
    severity: 'info',
    retryable: false,
    icon: 'clock',
    troubleshooting: [
      'Click the "Log in again" button below',
      'You will be redirected back to this page after logging in',
      'Consider enabling "Remember me" for longer sessions'
    ]
  }),

  invalid_credentials: (context) => ({
    title: 'Login Failed',
    description: context?.retryCount && context.retryCount > 2
      ? 'Multiple login attempts failed. Please check your email and password carefully, or reset your password if you\'ve forgotten it.'
      : 'The email or password you entered is incorrect. Please try again.',
    action: context?.retryCount && context.retryCount > 2 ? 'Reset password' : 'Try again',
    severity: 'error',
    retryable: true,
    icon: 'shield-x',
    helpUrl: '/forgot-password',
    troubleshooting: [
      'Double-check your email address for typos',
      'Make sure Caps Lock is off when entering your password',
      'Try copying and pasting your password to avoid typing errors',
      'If you\'ve forgotten your password, use the "Forgot Password" link'
    ]
  }),

  network_error: (context) => ({
    title: 'Connection Problem',
    description: 'Unable to connect to our servers. This might be due to a poor internet connection or temporary network issues.',
    action: 'Check connection and retry',
    severity: 'warning',
    retryable: true,
    icon: 'wifi-off',
    troubleshooting: [
      'Check your internet connection',
      'Try refreshing the page',
      'Disable VPN if you\'re using one',
      'Try switching between WiFi and mobile data',
      'Contact support if the problem persists'
    ]
  }),

  server_error: (context) => ({
    title: 'Server Temporarily Unavailable',
    description: 'Our servers are experiencing temporary issues. We\'re working to resolve this quickly.',
    action: 'Try again in a moment',
    severity: 'warning',
    retryable: true,
    icon: 'server',
    troubleshooting: [
      'Wait a few moments and try again',
      'The issue is on our end, not yours',
      'Check our status page for updates',
      'Contact support if the problem continues'
    ]
  }),

  permission_denied: (context) => ({
    title: 'Access Denied',
    description: context?.isStaff
      ? `Your ${context.userRole || 'staff'} account doesn't have permission to access this area. Contact your administrator if you need access.`
      : 'You don\'t have permission to access this page. Please log in with an account that has the required permissions.',
    action: context?.isStaff ? 'Contact administrator' : 'Log in with different account',
    severity: 'error',
    retryable: false,
    icon: 'shield-alert',
    troubleshooting: context?.isStaff ? [
      'Contact your system administrator',
      'Verify you\'re using the correct account',
      'Check if your role has been updated recently'
    ] : [
      'Make sure you\'re logged in to the correct account',
      'Contact support if you believe this is an error',
      'Check if you need a staff account for this page'
    ]
  }),

  account_locked: (context) => ({
    title: 'Account Temporarily Locked',
    description: 'Your account has been temporarily locked due to multiple failed login attempts. This is a security measure to protect your account.',
    action: 'Wait 15 minutes or reset password',
    severity: 'error',
    retryable: false,
    icon: 'lock',
    helpUrl: '/forgot-password',
    troubleshooting: [
      'Wait 15 minutes before trying again',
      'Reset your password using the "Forgot Password" link',
      'Contact support if you didn\'t attempt to log in',
      'Check for any suspicious activity on your account'
    ]
  }),

  rate_limited: (context) => ({
    title: 'Too Many Attempts',
    description: 'You\'ve made too many login attempts in a short time. Please wait a moment before trying again.',
    action: 'Wait and try again',
    severity: 'warning',
    retryable: true,
    icon: 'timer',
    troubleshooting: [
      'Wait 5-10 minutes before trying again',
      'This helps protect against automated attacks',
      'Make sure you\'re entering the correct credentials',
      'Consider resetting your password if you\'re unsure'
    ]
  }),

  maintenance_mode: (context) => ({
    title: 'Maintenance in Progress',
    description: 'We\'re currently performing scheduled maintenance to improve our services. Please try again shortly.',
    action: 'Try again later',
    severity: 'info',
    retryable: true,
    icon: 'wrench',
    troubleshooting: [
      'Maintenance usually takes 15-30 minutes',
      'Check our status page for updates',
      'No action is needed from you',
      'Your data and account are safe'
    ]
  }),

  cors_error: (context) => ({
    title: 'Browser Security Issue',
    description: 'Your browser is blocking the login request due to security settings. This can happen with certain browser extensions or security software.',
    action: 'Check browser settings',
    severity: 'warning',
    retryable: true,
    icon: 'shield',
    troubleshooting: [
      'Disable ad blockers or privacy extensions temporarily',
      'Try using an incognito/private browsing window',
      'Clear your browser cache and cookies',
      'Try a different browser',
      'Contact support if the problem persists'
    ]
  }),

  timeout: (context) => ({
    title: 'Request Timed Out',
    description: 'The login request took too long to complete. This might be due to a slow connection or server load.',
    action: 'Try again',
    severity: 'warning',
    retryable: true,
    icon: 'clock',
    troubleshooting: [
      'Check your internet connection speed',
      'Try again in a few moments',
      'Close other apps using internet',
      'Contact support if timeouts continue'
    ]
  }),

  invalid_token: (context) => ({
    title: 'Invalid Authentication',
    description: 'Your authentication token is invalid or corrupted. Please log in again to get a new token.',
    action: 'Log in again',
    severity: 'error',
    retryable: false,
    icon: 'key',
    troubleshooting: [
      'Log out completely and log back in',
      'Clear your browser cache and cookies',
      'This can happen after system updates',
      'Contact support if the problem persists'
    ]
  }),

  token_refresh_failed: (context) => ({
    title: 'Session Refresh Failed',
    description: 'We couldn\'t refresh your session automatically. Please log in again to continue.',
    action: 'Log in again',
    severity: 'warning',
    retryable: false,
    icon: 'refresh-cw',
    troubleshooting: [
      'This is a security measure',
      'Your session may have been inactive too long',
      'Log in again to continue where you left off',
      'Consider enabling "Remember me" for longer sessions'
    ]
  }),

  two_factor_required: (context) => ({
    title: 'Two-Factor Authentication Required',
    description: 'Your account requires two-factor authentication for additional security. Please complete the verification process.',
    action: 'Complete 2FA verification',
    severity: 'info',
    retryable: false,
    icon: 'smartphone',
    troubleshooting: [
      'Check your authenticator app for the code',
      'Make sure your device time is correct',
      'Use backup codes if you can\'t access your device',
      'Contact support if you\'ve lost access to 2FA'
    ]
  }),

  email_not_verified: (context) => ({
    title: 'Email Verification Required',
    description: 'Please verify your email address before logging in. Check your inbox for a verification email.',
    action: 'Verify email address',
    severity: 'info',
    retryable: false,
    icon: 'mail',
    helpUrl: '/resend-verification',
    troubleshooting: [
      'Check your email inbox and spam folder',
      'Click the verification link in the email',
      'Request a new verification email if needed',
      'Contact support if you didn\'t receive the email'
    ]
  }),

  unknown_error: (context) => ({
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred during login. Our team has been notified and is working to fix this.',
    action: 'Try again or contact support',
    severity: 'error',
    retryable: true,
    icon: 'alert-triangle',
    troubleshooting: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Try using a different browser',
      'Contact support with details about what you were doing'
    ]
  })
}

/**
 * Get user-friendly error message for auth error type
 */
export function getAuthErrorMessage(
  errorType: AuthErrorType, 
  context?: AuthErrorContext
): AuthErrorMessage {
  const messageGenerator = AUTH_ERROR_MESSAGES[errorType]
  if (!messageGenerator) {
    return AUTH_ERROR_MESSAGES.unknown_error(context)
  }
  
  return messageGenerator(context)
}

/**
 * Determine error type from error object
 */
export function categorizeAuthError(error: any): AuthErrorType {
  // Network errors
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return 'network_error'
  }
  
  // CORS errors
  if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
    return 'cors_error'
  }
  
  // Timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return 'timeout'
  }
  
  // HTTP status-based errors
  if (error.status) {
    switch (error.status) {
      case 401:
        if (error.message?.includes('expired')) return 'expired_session'
        if (error.message?.includes('invalid')) return 'invalid_credentials'
        if (error.message?.includes('token')) return 'invalid_token'
        return 'invalid_credentials'
      
      case 403:
        if (error.message?.includes('locked')) return 'account_locked'
        if (error.message?.includes('2fa') || error.message?.includes('two-factor')) return 'two_factor_required'
        if (error.message?.includes('verify') || error.message?.includes('email')) return 'email_not_verified'
        return 'permission_denied'
      
      case 408:
        return 'timeout'
      
      case 423:
        return 'account_locked'
      
      case 429:
        return 'rate_limited'
      
      case 500:
      case 502:
      case 503:
      case 504:
        return 'server_error'
      
      default:
        return 'unknown_error'
    }
  }
  
  // Message-based categorization
  if (error.message) {
    const message = error.message.toLowerCase()
    
    if (message.includes('expired')) return 'expired_session'
    if (message.includes('invalid') && message.includes('credentials')) return 'invalid_credentials'
    if (message.includes('network') || message.includes('connection')) return 'network_error'
    if (message.includes('permission') || message.includes('access')) return 'permission_denied'
    if (message.includes('locked')) return 'account_locked'
    if (message.includes('rate') || message.includes('limit')) return 'rate_limited'
    if (message.includes('maintenance')) return 'maintenance_mode'
    if (message.includes('token')) return 'invalid_token'
    if (message.includes('2fa') || message.includes('two-factor')) return 'two_factor_required'
    if (message.includes('verify') || message.includes('email')) return 'email_not_verified'
  }
  
  return 'unknown_error'
}

/**
 * Get error message with automatic categorization
 */
export function getAuthErrorMessageFromError(
  error: any, 
  context?: AuthErrorContext
): AuthErrorMessage {
  const errorType = categorizeAuthError(error)
  return getAuthErrorMessage(errorType, context)
}
