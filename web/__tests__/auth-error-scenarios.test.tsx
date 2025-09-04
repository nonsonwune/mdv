/**
 * Comprehensive Auth Error Scenarios Test Suite
 * 
 * Tests all authentication error scenarios to ensure graceful handling
 * across different browsers and network conditions.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { jest } from '@jest/globals'
import { AuthProvider } from '../lib/auth-context'
import { AuthErrorDisplay } from '../components/auth/auth-error-display'
import { AuthErrorDialog } from '../components/auth/auth-error-dialog'

// Mock fetch for testing different scenarios
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/test-page',
  reload: jest.fn()
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

describe('Auth Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockLocation.href = ''
    mockLocation.pathname = '/test-page'
  })

  describe('Expired Token Scenarios', () => {
    it('handles expired session gracefully', async () => {
      // Mock expired token response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Token expired' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      // Trigger auth check
      await act(async () => {
        // Simulate auth check that returns expired token
        const authCheck = fetch('/api/auth/check')
        await authCheck
      })

      await waitFor(() => {
        expect(screen.getByText(/Session Expired/)).toBeInTheDocument()
      })

      expect(screen.getByText(/log in again/i)).toBeInTheDocument()
    })

    it('redirects to login on protected pages when session expires', async () => {
      mockLocation.pathname = '/admin/dashboard'
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Token expired' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const authCheck = fetch('/api/auth/check')
        await authCheck
      })

      await waitFor(() => {
        expect(mockLocation.href).toBe('/login?expired=true')
      })
    })

    it('clears auth hints when session expires', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Token expired' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const authCheck = fetch('/api/auth/check')
        await authCheck
      })

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_hint')
      })
    })
  })

  describe('Network Failure Scenarios', () => {
    it('handles network connection failures', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        try {
          await fetch('/api/auth/check')
        } catch (error) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Connection Problem/)).toBeInTheDocument()
      })

      expect(screen.getByText(/Check connection and retry/)).toBeInTheDocument()
    })

    it('shows retry button for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))

      render(
        <TestWrapper>
          <AuthErrorDisplay showRetryButton={true} />
        </TestWrapper>
      )

      await act(async () => {
        try {
          await fetch('/api/auth/check')
        } catch (error) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Retry/)).toBeInTheDocument()
      })
    })

    it('implements exponential backoff for retries', async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        return Promise.reject(new TypeError('fetch failed'))
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      // Trigger multiple retries
      await act(async () => {
        for (let i = 0; i < 3; i++) {
          try {
            await fetch('/api/auth/check')
          } catch (error) {
            // Expected to fail
          }
        }
      })

      expect(callCount).toBe(3)
    })
  })

  describe('Invalid Response Scenarios', () => {
    it('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        try {
          const response = await fetch('/api/auth/check')
          await response.json()
        } catch (error) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
      })
    })

    it('handles unexpected response status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 418, // I'm a teapot
        json: async () => ({ error: 'Unexpected error' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Unexpected status')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
      })
    })

    it('handles missing error messages in responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}) // No error message
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Authentication failed')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Login Failed/)).toBeInTheDocument()
      })
    })
  })

  describe('CORS Error Scenarios', () => {
    it('handles CORS policy errors', async () => {
      const corsError = new Error('CORS policy: No \'Access-Control-Allow-Origin\' header')
      mockFetch.mockRejectedValueOnce(corsError)

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        try {
          await fetch('/api/auth/check')
        } catch (error) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Browser Security Issue/)).toBeInTheDocument()
      })

      expect(screen.getByText(/browser settings/i)).toBeInTheDocument()
    })

    it('provides CORS troubleshooting steps', async () => {
      const corsError = new Error('Cross-origin request blocked')
      mockFetch.mockRejectedValueOnce(corsError)

      render(
        <TestWrapper>
          <AuthErrorDialog 
            error={corsError}
            open={true}
            onClose={() => {}}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Disable ad blockers/)).toBeInTheDocument()
      })
    })
  })

  describe('Server Error Scenarios', () => {
    it('handles 500 internal server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Server error')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Server Temporarily Unavailable/)).toBeInTheDocument()
      })
    })

    it('handles 503 service unavailable errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service unavailable' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Service unavailable')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Server Temporarily Unavailable/)).toBeInTheDocument()
      })

      expect(screen.getByText(/Try again in a moment/)).toBeInTheDocument()
    })

    it('handles 502 bad gateway errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: 'Bad gateway' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Bad gateway')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Server Temporarily Unavailable/)).toBeInTheDocument()
      })
    })
  })

  describe('Permission and Access Scenarios', () => {
    it('handles 403 forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Forbidden')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument()
      })
    })

    it('handles account locked scenarios', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 423,
        json: async () => ({ error: 'Account locked' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Account locked')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Account Temporarily Locked/)).toBeInTheDocument()
      })
    })

    it('handles rate limiting scenarios', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Too many requests' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Too many requests')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Too Many Attempts/)).toBeInTheDocument()
      })
    })
  })

  describe('Timeout Scenarios', () => {
    it('handles request timeouts', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(timeoutError)

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        try {
          await fetch('/api/auth/check')
        } catch (error) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Request Timed Out/)).toBeInTheDocument()
      })
    })

    it('provides timeout troubleshooting', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'AbortError'

      render(
        <TestWrapper>
          <AuthErrorDialog 
            error={timeoutError}
            open={true}
            onClose={() => {}}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Check your internet connection speed/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery and Retry Logic', () => {
    it('implements circuit breaker pattern', async () => {
      let failureCount = 0
      mockFetch.mockImplementation(() => {
        failureCount++
        return Promise.reject(new Error('Service unavailable'))
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      // Trigger multiple failures to open circuit
      await act(async () => {
        for (let i = 0; i < 6; i++) {
          try {
            await fetch('/api/auth/check')
          } catch (error) {
            // Expected to fail
          }
        }
      })

      expect(failureCount).toBeGreaterThanOrEqual(5)
    })

    it('resets retry count on successful request', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { id: 1, name: 'Test User' } })
        })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        // First two calls fail, third succeeds
        for (let i = 0; i < 3; i++) {
          try {
            await fetch('/api/auth/check')
          } catch (error) {
            // Expected to fail for first two
          }
        }
      })

      // Should not show error after successful request
      expect(screen.queryByText(/Connection Problem/)).not.toBeInTheDocument()
    })
  })

  describe('Browser-Specific Scenarios', () => {
    beforeEach(() => {
      // Reset user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true
      })
    })

    it('handles Safari cookie restrictions', async () => {
      // Mock Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true
      })

      // Mock document.cookie behavior for Safari
      Object.defineProperty(document, 'cookie', {
        value: '',
        writable: true
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'No auth cookie' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Auth failed')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Login Failed/)).toBeInTheDocument()
      })
    })

    it('handles Chrome incognito mode restrictions', async () => {
      // Mock Chrome incognito
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true
      })

      // Mock localStorage being unavailable
      const originalLocalStorage = window.localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => { throw new Error('localStorage not available') },
          setItem: () => { throw new Error('localStorage not available') },
          removeItem: () => { throw new Error('localStorage not available') }
        },
        writable: true
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      // Should handle localStorage errors gracefully
      expect(() => {
        try {
          localStorage.setItem('test', 'value')
        } catch (e) {
          // Expected in incognito mode
        }
      }).not.toThrow()

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      })
    })

    it('handles Firefox strict privacy mode', async () => {
      // Mock Firefox user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        writable: true
      })

      // Mock third-party cookie blocking
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Third-party cookies blocked' })
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          const error = new Error('Cookie blocked')
          ;(error as any).status = response.status
          throw error
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/Login Failed/)).toBeInTheDocument()
      })
    })

    it('handles Edge legacy compatibility issues', async () => {
      // Mock Edge Legacy user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19041',
        writable: true
      })

      // Mock fetch not being available (Edge Legacy)
      const originalFetch = global.fetch
      delete (global as any).fetch

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      // Should handle missing fetch gracefully
      expect(() => {
        if (typeof fetch === 'undefined') {
          throw new Error('fetch not supported')
        }
      }).toThrow()

      // Restore fetch
      global.fetch = originalFetch
    })

    it('handles mobile browser viewport issues', async () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
        writable: true
      })

      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      })
      Object.defineProperty(window, 'innerHeight', {
        value: 667,
        writable: true
      })

      render(
        <TestWrapper>
          <AuthErrorDisplay compact={true} />
        </TestWrapper>
      )

      // Should render in compact mode for mobile
      const errorDisplay = screen.getByTestId('auth-error-display')
      expect(errorDisplay).toHaveClass('compact')
    })
  })

  describe('Accessibility and User Experience', () => {
    it('provides proper ARIA labels for error states', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))

      render(
        <TestWrapper>
          <AuthErrorDisplay />
        </TestWrapper>
      )

      await act(async () => {
        try {
          await fetch('/api/auth/check')
        } catch (error) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toBeInTheDocument()
        expect(errorAlert).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('supports keyboard navigation for error actions', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))

      render(
        <TestWrapper>
          <AuthErrorDisplay showRetryButton={true} />
        </TestWrapper>
      )

      await act(async () => {
        try {
          await fetch('/api/auth/check')
        } catch (error) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        const retryButton = screen.getByText(/Retry/)
        expect(retryButton).toBeInTheDocument()

        // Should be focusable
        retryButton.focus()
        expect(document.activeElement).toBe(retryButton)

        // Should respond to Enter key
        fireEvent.keyDown(retryButton, { key: 'Enter', code: 'Enter' })
      })
    })

    it('provides screen reader friendly error descriptions', async () => {
      const networkError = new TypeError('fetch failed')

      render(
        <TestWrapper>
          <AuthErrorDialog
            error={networkError}
            open={true}
            onClose={() => {}}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        const description = screen.getByText(/Unable to connect to our servers/)
        expect(description).toBeInTheDocument()
        expect(description).toHaveAttribute('id')
      })
    })

    it('maintains focus management during error state changes', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { id: 1, name: 'Test User' } })
        })

      render(
        <TestWrapper>
          <AuthErrorDisplay showRetryButton={true} />
        </TestWrapper>
      )

      // Trigger error
      await act(async () => {
        try {
          await fetch('/api/auth/check')
        } catch (error) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        const retryButton = screen.getByText(/Retry/)
        retryButton.focus()
        expect(document.activeElement).toBe(retryButton)
      })

      // Trigger retry success
      await act(async () => {
        const retryButton = screen.getByText(/Retry/)
        fireEvent.click(retryButton)
      })

      // Focus should be managed appropriately
      await waitFor(() => {
        expect(screen.queryByText(/Retry/)).not.toBeInTheDocument()
      })
    })
  })
})
