/**
 * Auth Error Integration Tests
 * 
 * End-to-end integration tests for the complete auth error handling flow
 * including error boundaries, context, and user interactions.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import { AuthProvider, useAuth } from '../lib/auth-context'
import { AuthErrorBoundary } from '../components/auth/auth-error-boundary'
import { AuthErrorDisplay } from '../components/auth/auth-error-display'
import { AuthErrorDialog } from '../components/auth/auth-error-dialog'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock window methods
const mockLocation = {
  href: '',
  pathname: '/test',
  reload: jest.fn()
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Test component that uses auth
function TestAuthComponent() {
  const { user, checkAuth, authError, retryAuth, clearAuthError } = useAuth()
  
  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.name}` : 'Not logged in'}
      </div>
      <div data-testid="error-status">
        {authError ? `Error: ${authError.message}` : 'No error'}
      </div>
      <button onClick={checkAuth} data-testid="check-auth">
        Check Auth
      </button>
      <button onClick={retryAuth} data-testid="retry-auth">
        Retry Auth
      </button>
      <button onClick={clearAuthError} data-testid="clear-error">
        Clear Error
      </button>
    </div>
  )
}

// Component that throws auth errors
function ErrorThrowingComponent({ errorType }: { errorType: string }) {
  React.useEffect(() => {
    const error = new Error(`Test ${errorType} error`) as any
    
    switch (errorType) {
      case 'network':
        error.name = 'TypeError'
        error.message = 'fetch failed'
        break
      case 'auth':
        error.status = 401
        error.message = 'Unauthorized'
        break
      case 'permission':
        error.status = 403
        error.message = 'Forbidden'
        break
      case 'server':
        error.status = 503
        error.message = 'Service unavailable'
        break
    }
    
    throw error
  }, [errorType])
  
  return <div>This should not render</div>
}

describe('Auth Error Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockLocation.href = ''
    mockLocation.pathname = '/test'
  })

  describe('Complete Auth Error Flow', () => {
    it('handles complete auth check error flow', async () => {
      // Mock failed auth check
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Token expired' })
      })

      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <TestAuthComponent />
            <AuthErrorDisplay />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      // Initial state
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in')
      expect(screen.getByTestId('error-status')).toHaveTextContent('No error')

      // Trigger auth check
      await act(async () => {
        fireEvent.click(screen.getByTestId('check-auth'))
      })

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('error-status')).toHaveTextContent('Error:')
        expect(screen.getByText(/Session Expired/)).toBeInTheDocument()
      })

      // Clear error
      await act(async () => {
        fireEvent.click(screen.getByTestId('clear-error'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('error-status')).toHaveTextContent('No error')
      })
    })

    it('handles retry flow with eventual success', async () => {
      // Mock failed then successful auth check
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ error: 'Service unavailable' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { id: 1, name: 'Test User', role: 'customer' } })
        })

      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <TestAuthComponent />
            <AuthErrorDisplay showRetryButton={true} />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      // Trigger initial auth check (fails)
      await act(async () => {
        fireEvent.click(screen.getByTestId('check-auth'))
      })

      // Should show error with retry option
      await waitFor(() => {
        expect(screen.getByText(/Server Temporarily Unavailable/)).toBeInTheDocument()
        expect(screen.getByText(/Try again in a moment/)).toBeInTheDocument()
      })

      // Retry auth (succeeds)
      await act(async () => {
        fireEvent.click(screen.getByTestId('retry-auth'))
      })

      // Should clear error and show user
      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Test User')
        expect(screen.getByTestId('error-status')).toHaveTextContent('No error')
      })
    })

    it('handles network error with automatic retry', async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.reject(new TypeError('fetch failed'))
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: { id: 1, name: 'Test User', role: 'customer' } })
        })
      })

      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <TestAuthComponent />
            <AuthErrorDisplay />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      // Trigger auth check
      await act(async () => {
        fireEvent.click(screen.getByTestId('check-auth'))
      })

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Test User')
      }, { timeout: 5000 })

      expect(callCount).toBe(3) // 2 failures + 1 success
    })
  })

  describe('Error Boundary Integration', () => {
    it('catches and displays network errors in boundary', async () => {
      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <ErrorThrowingComponent errorType="network" />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Connection Problem/)).toBeInTheDocument()
        expect(screen.getByText(/Try Again/)).toBeInTheDocument()
      })
    })

    it('catches and displays auth errors in boundary', async () => {
      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <ErrorThrowingComponent errorType="auth" />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Authentication Required/)).toBeInTheDocument()
        expect(screen.getByText(/Log In/)).toBeInTheDocument()
      })
    })

    it('catches and displays permission errors in boundary', async () => {
      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <ErrorThrowingComponent errorType="permission" />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument()
      })
    })

    it('retries from error boundary', async () => {
      let shouldThrow = true
      
      function ConditionalErrorComponent() {
        if (shouldThrow) {
          const error = new Error('Service unavailable') as any
          error.status = 503
          throw error
        }
        return <div>Success!</div>
      }

      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <ConditionalErrorComponent />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
      })

      // Stop throwing error and retry
      shouldThrow = false
      
      await act(async () => {
        const retryButton = screen.getByText(/Try Again/)
        fireEvent.click(retryButton)
      })

      // Should show success after retry
      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Integration', () => {
    it('shows detailed error information in dialog', async () => {
      const networkError = new TypeError('fetch failed')
      
      render(
        <AuthProvider>
          <AuthErrorDialog 
            error={networkError}
            open={true}
            onClose={() => {}}
            showTechnicalDetails={true}
          />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Connection Problem/)).toBeInTheDocument()
        expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument()
        expect(screen.getByText(/Technical Details/)).toBeInTheDocument()
      })
    })

    it('handles dialog retry functionality', async () => {
      const retryFn = jest.fn().mockResolvedValue(undefined)
      const onClose = jest.fn()
      
      render(
        <AuthProvider>
          <AuthErrorDialog 
            error={new Error('Test error')}
            open={true}
            onClose={onClose}
            onRetry={retryFn}
          />
        </AuthProvider>
      )

      await act(async () => {
        const retryButton = screen.getByText(/Try again/)
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(retryFn).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('copies error details to clipboard', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      })

      const testError = new Error('Test error') as any
      testError.status = 500
      
      render(
        <AuthProvider>
          <AuthErrorDialog 
            error={testError}
            open={true}
            onClose={() => {}}
            showTechnicalDetails={true}
          />
        </AuthProvider>
      )

      await act(async () => {
        const copyButton = screen.getByRole('button', { name: /copy/i })
        fireEvent.click(copyButton)
      })

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining('"message": "Test error"')
        )
      })
    })
  })

  describe('User Interaction Flows', () => {
    it('handles complete login error flow', async () => {
      const user = userEvent.setup()
      
      // Mock login failure then success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Invalid credentials' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            token: 'test-token',
            user: { id: 1, name: 'Test User', role: 'customer' }
          })
        })

      function LoginComponent() {
        const { loginWithRetry, authError } = useAuth()
        const [credentials, setCredentials] = React.useState({ email: '', password: '' })
        
        const handleLogin = async () => {
          try {
            await loginWithRetry(credentials)
          } catch (error) {
            // Error handled by context
          }
        }
        
        return (
          <div>
            <input
              data-testid="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
            />
            <input
              data-testid="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
            />
            <button onClick={handleLogin} data-testid="login">
              Login
            </button>
            {authError && <AuthErrorDisplay showRetryButton={true} />}
          </div>
        )
      }

      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <LoginComponent />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      // Enter credentials
      await user.type(screen.getByTestId('email'), 'test@example.com')
      await user.type(screen.getByTestId('password'), 'wrongpassword')

      // Attempt login (fails)
      await user.click(screen.getByTestId('login'))

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Login Failed/)).toBeInTheDocument()
      })

      // Retry login (succeeds)
      await user.click(screen.getByText(/Try again/))

      // Should clear error
      await waitFor(() => {
        expect(screen.queryByText(/Login Failed/)).not.toBeInTheDocument()
      })
    })

    it('handles session expiry during navigation', async () => {
      mockLocation.pathname = '/admin/dashboard'
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Token expired' })
      })

      render(
        <AuthProvider>
          <AuthErrorBoundary>
            <TestAuthComponent />
          </AuthErrorBoundary>
        </AuthProvider>
      )

      // Trigger auth check on protected route
      await act(async () => {
        fireEvent.click(screen.getByTestId('check-auth'))
      })

      // Should redirect to login
      await waitFor(() => {
        expect(mockLocation.href).toBe('/login?expired=true')
      })
    })
  })
})
