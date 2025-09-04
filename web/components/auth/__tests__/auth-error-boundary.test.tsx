/**
 * Auth Error Tests
 *
 * Tests for auth error handling components and error message system.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthErrorBoundary, ProtectedRouteErrorBoundary, withAuthErrorBoundary } from '../auth-error-boundary'
import { AuthErrorDisplay } from '../auth-error-display'
import { AuthErrorDialog } from '../auth-error-dialog'
import {
  getAuthErrorMessage,
  categorizeAuthError,
  getAuthErrorMessageFromError
} from '../../../lib/auth-error-messages'

// Mock components for testing
const ThrowError = ({ error }: { error?: Error }) => {
  if (error) {
    throw error
  }
  return <div>No error</div>
}

const NetworkError = () => {
  const error = new TypeError('fetch failed')
  throw error
}

const AuthError = () => {
  const error = new Error('Unauthorized') as any
  error.status = 401
  error.type = 'auth'
  throw error
}

const ServerError = () => {
  const error = new Error('Server Error') as any
  error.status = 503
  error.type = 'server'
  error.retryable = true
  throw error
}

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/protected-route'
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocation.href = ''
    mockLocation.pathname = '/protected-route'
  })

  it('renders children when there is no error', () => {
    render(
      <AuthErrorBoundary>
        <div>Test content</div>
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    const error = new Error('Test error')
    
    render(
      <AuthErrorBoundary>
        <ThrowError error={error} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('categorizes network errors correctly', () => {
    render(
      <AuthErrorBoundary>
        <NetworkError />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Network connection failed. Please check your internet connection and try again.')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('categorizes auth errors correctly', () => {
    render(
      <AuthErrorBoundary>
        <AuthError />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Authentication Required')).toBeInTheDocument()
    expect(screen.getByText('Your session has expired. Please log in again to continue.')).toBeInTheDocument()
    expect(screen.getByText('Log In')).toBeInTheDocument()
  })

  it('shows retry button for retryable errors', () => {
    render(
      <AuthErrorBoundary>
        <ServerError />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('handles retry functionality', async () => {
    const { rerender } = render(
      <AuthErrorBoundary>
        <ServerError />
      </AuthErrorBoundary>
    )

    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)

    expect(screen.getByText('Retrying...')).toBeInTheDocument()

    // Wait for retry delay and re-render with no error
    await waitFor(() => {
      rerender(
        <AuthErrorBoundary>
          <div>Success after retry</div>
        </AuthErrorBoundary>
      )
    }, { timeout: 2000 })
  })

  it('limits retry attempts', () => {
    render(
      <AuthErrorBoundary>
        <ServerError />
      </AuthErrorBoundary>
    )

    const retryButton = screen.getByText('Try Again')
    
    // Click retry 3 times
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)

    expect(screen.getByText('Retry attempt 3 of 3 failed.')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()
    const error = new Error('Test error')

    render(
      <AuthErrorBoundary onError={onError}>
        <ThrowError error={error} />
      </AuthErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(error, expect.any(Object))
  })

  it('renders custom fallback when provided', () => {
    const CustomFallback = () => <div>Custom error message</div>
    const error = new Error('Test error')

    render(
      <AuthErrorBoundary fallback={<CustomFallback />}>
        <ThrowError error={error} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('hides retry button when showRetry is false', () => {
    render(
      <AuthErrorBoundary showRetry={false}>
        <ServerError />
      </AuthErrorBoundary>
    )

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
  })

  it('hides navigation buttons when showNavigation is false', () => {
    render(
      <AuthErrorBoundary showNavigation={false}>
        <AuthError />
      </AuthErrorBoundary>
    )

    expect(screen.queryByText('Log In')).not.toBeInTheDocument()
    expect(screen.queryByText('Go Home')).not.toBeInTheDocument()
  })
})

describe('ProtectedRouteErrorBoundary', () => {
  it('redirects to login for auth errors', () => {
    render(
      <ProtectedRouteErrorBoundary>
        <AuthError />
      </ProtectedRouteErrorBoundary>
    )

    expect(mockLocation.href).toBe('/login?redirect=%2Fprotected-route')
  })

  it('uses custom redirect URL', () => {
    render(
      <ProtectedRouteErrorBoundary redirectTo="/custom-login">
        <AuthError />
      </ProtectedRouteErrorBoundary>
    )

    expect(mockLocation.href).toBe('/custom-login?redirect=%2Fprotected-route')
  })

  it('does not redirect for non-auth errors', () => {
    render(
      <ProtectedRouteErrorBoundary>
        <ServerError />
      </ProtectedRouteErrorBoundary>
    )

    expect(mockLocation.href).toBe('')
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})

describe('withAuthErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const TestComponent = () => <div>Test component</div>
    const WrappedComponent = withAuthErrorBoundary(TestComponent)

    render(<WrappedComponent />)

    expect(screen.getByText('Test component')).toBeInTheDocument()
  })

  it('catches errors in wrapped component', () => {
    const ErrorComponent = () => {
      throw new Error('Component error')
    }
    const WrappedComponent = withAuthErrorBoundary(ErrorComponent)

    render(<WrappedComponent />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('passes error boundary props to wrapper', () => {
    const TestComponent = () => {
      throw new Error('Test error')
    }
    const WrappedComponent = withAuthErrorBoundary(TestComponent, {
      showRetry: false
    })

    render(<WrappedComponent />)

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
  })
})

describe('Error categorization', () => {
  it('categorizes network errors', () => {
    const networkError = new TypeError('fetch failed')
    
    render(
      <AuthErrorBoundary>
        <ThrowError error={networkError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText(/Network connection failed/)).toBeInTheDocument()
  })

  it('categorizes 401 errors as auth errors', () => {
    const authError = new Error('Unauthorized') as any
    authError.status = 401
    
    render(
      <AuthErrorBoundary>
        <ThrowError error={authError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Authentication Required')).toBeInTheDocument()
  })

  it('categorizes 403 errors as permission errors', () => {
    const permissionError = new Error('Forbidden') as any
    permissionError.status = 403
    
    render(
      <AuthErrorBoundary>
        <ThrowError error={permissionError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText(/You do not have permission/)).toBeInTheDocument()
  })

  it('categorizes server errors as retryable', () => {
    const serverError = new Error('Server Error') as any
    serverError.status = 503
    
    render(
      <AuthErrorBoundary>
        <ThrowError error={serverError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText(/Server temporarily unavailable/)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })
})

describe('Auth Error Messages', () => {
  describe('getAuthErrorMessage', () => {
    it('returns correct message for expired session', () => {
      const message = getAuthErrorMessage('expired_session')

      expect(message.title).toBe('Session Expired')
      expect(message.description).toContain('Your session has expired')
      expect(message.action).toBe('Log in again')
      expect(message.severity).toBe('info')
      expect(message.retryable).toBe(false)
    })

    it('returns staff-specific message for expired session', () => {
      const message = getAuthErrorMessage('expired_session', { isStaff: true })

      expect(message.description).toContain('staff session')
    })

    it('returns correct message for invalid credentials', () => {
      const message = getAuthErrorMessage('invalid_credentials')

      expect(message.title).toBe('Login Failed')
      expect(message.description).toContain('email or password')
      expect(message.severity).toBe('error')
      expect(message.retryable).toBe(true)
    })

    it('returns different message for multiple failed attempts', () => {
      const message = getAuthErrorMessage('invalid_credentials', { retryCount: 3 })

      expect(message.description).toContain('Multiple login attempts')
      expect(message.action).toBe('Reset password')
    })

    it('returns correct message for network errors', () => {
      const message = getAuthErrorMessage('network_error')

      expect(message.title).toBe('Connection Problem')
      expect(message.description).toContain('network issues')
      expect(message.severity).toBe('warning')
      expect(message.retryable).toBe(true)
    })

    it('includes troubleshooting steps', () => {
      const message = getAuthErrorMessage('network_error')

      expect(message.troubleshooting).toBeDefined()
      expect(message.troubleshooting!.length).toBeGreaterThan(0)
      expect(message.troubleshooting![0]).toContain('Check your internet')
    })
  })

  describe('categorizeAuthError', () => {
    it('categorizes network errors correctly', () => {
      const networkError = new TypeError('fetch failed')
      expect(categorizeAuthError(networkError)).toBe('network_error')
    })

    it('categorizes CORS errors correctly', () => {
      const corsError = new Error('CORS policy blocked')
      expect(categorizeAuthError(corsError)).toBe('cors_error')
    })

    it('categorizes timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout')
      expect(categorizeAuthError(timeoutError)).toBe('timeout')
    })

    it('categorizes 401 errors correctly', () => {
      const authError = new Error('Unauthorized') as any
      authError.status = 401
      expect(categorizeAuthError(authError)).toBe('invalid_credentials')
    })

    it('categorizes expired session correctly', () => {
      const expiredError = new Error('Token expired') as any
      expiredError.status = 401
      expect(categorizeAuthError(expiredError)).toBe('expired_session')
    })

    it('categorizes 403 errors correctly', () => {
      const forbiddenError = new Error('Forbidden') as any
      forbiddenError.status = 403
      expect(categorizeAuthError(forbiddenError)).toBe('permission_denied')
    })

    it('categorizes rate limiting correctly', () => {
      const rateLimitError = new Error('Too many requests') as any
      rateLimitError.status = 429
      expect(categorizeAuthError(rateLimitError)).toBe('rate_limited')
    })

    it('categorizes server errors correctly', () => {
      const serverError = new Error('Internal server error') as any
      serverError.status = 500
      expect(categorizeAuthError(serverError)).toBe('server_error')
    })

    it('falls back to unknown error for unrecognized errors', () => {
      const unknownError = new Error('Something weird happened')
      expect(categorizeAuthError(unknownError)).toBe('unknown_error')
    })
  })

  describe('getAuthErrorMessageFromError', () => {
    it('automatically categorizes and returns message', () => {
      const networkError = new TypeError('fetch failed')
      const message = getAuthErrorMessageFromError(networkError)

      expect(message.title).toBe('Connection Problem')
      expect(message.description).toContain('network issues')
    })

    it('uses context for personalized messages', () => {
      const authError = new Error('Unauthorized') as any
      authError.status = 401

      const message = getAuthErrorMessageFromError(authError, {
        isStaff: true,
        userRole: 'admin'
      })

      expect(message.description).toContain('staff session')
    })
  })
})
