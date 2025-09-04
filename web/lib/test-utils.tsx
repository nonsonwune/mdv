/**
 * Comprehensive testing utilities for React components and hooks
 */

import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions, RenderResult, screen, waitFor } from '@testing-library/react'
import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'next/navigation'
import { AuthProvider } from './auth-context'
import { ToastProvider } from '../components/ui/toast'

// Mock user data for testing
export const mockUsers = {
  admin: {
    id: 1,
    name: 'Admin User',
    email: 'admin@mdv.ng',
    role: 'admin',
    active: true,
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  },
  staff: {
    id: 2,
    name: 'Staff User',
    email: 'staff@mdv.ng',
    role: 'staff',
    active: true,
    exp: Math.floor(Date.now() / 1000) + 3600
  },
  customer: {
    id: 3,
    name: 'Customer User',
    email: 'customer@example.com',
    role: 'customer',
    active: true,
    exp: Math.floor(Date.now() / 1000) + 3600
  }
}

// Mock API responses
export const mockApiResponses = {
  loginSuccess: {
    access_token: 'mock-token',
    token_type: 'bearer',
    role: 'admin',
    user: mockUsers.admin
  },
  loginError: {
    error: {
      code: 'AUTH_1001',
      message: 'Invalid email or password',
      category: 'authentication'
    }
  },
  validationError: {
    error: {
      code: 'VAL_1201',
      message: 'Validation failed',
      category: 'validation',
      details: [
        {
          field: 'email',
          message: 'Email is required',
          code: 'REQUIRED'
        }
      ]
    }
  }
}

// Test wrapper component
interface TestWrapperProps {
  children: ReactNode
  initialUser?: typeof mockUsers.admin | null
  queryClient?: QueryClient
}

function TestWrapper({ children, initialUser = null, queryClient }: TestWrapperProps) {
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        <AuthProvider initialUser={initialUser}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialUser?: typeof mockUsers.admin | null
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { initialUser, queryClient, ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper initialUser={initialUser} queryClient={queryClient}>
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  })
}

// Custom hook render function
interface CustomRenderHookOptions<TProps> extends Omit<RenderHookOptions<TProps>, 'wrapper'> {
  initialUser?: typeof mockUsers.admin | null
  queryClient?: QueryClient
}

export function renderHookWithProviders<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options: CustomRenderHookOptions<TProps> = {}
): RenderHookResult<TResult, TProps> {
  const { initialUser, queryClient, ...renderHookOptions } = options

  return renderHook(hook, {
    wrapper: ({ children }) => (
      <TestWrapper initialUser={initialUser} queryClient={queryClient}>
        {children}
      </TestWrapper>
    ),
    ...renderHookOptions,
  })
}

// Mock fetch function
export function createMockFetch(responses: Record<string, any>) {
  return jest.fn((url: string, options?: RequestInit) => {
    const method = options?.method || 'GET'
    const key = `${method} ${url}`
    
    const response = responses[key] || responses[url]
    
    if (!response) {
      return Promise.reject(new Error(`No mock response for ${key}`))
    }

    const mockResponse = {
      ok: response.status ? response.status < 400 : true,
      status: response.status || 200,
      statusText: response.statusText || 'OK',
      json: () => Promise.resolve(response.data || response),
      text: () => Promise.resolve(JSON.stringify(response.data || response)),
      headers: new Headers(response.headers || {}),
    }

    if (response.delay) {
      return new Promise(resolve => {
        setTimeout(() => resolve(mockResponse), response.delay)
      })
    }

    return Promise.resolve(mockResponse)
  })
}

// Test utilities for user interactions
export const userInteractions = {
  async fillLoginForm(email: string, password: string) {
    const user = userEvent.setup()
    
    const emailInput = screen.getByTestId('email-input')
    const passwordInput = screen.getByTestId('password-input')
    
    await user.clear(emailInput)
    await user.type(emailInput, email)
    
    await user.clear(passwordInput)
    await user.type(passwordInput, password)
  },

  async submitForm() {
    const user = userEvent.setup()
    const submitButton = screen.getByTestId('login-button')
    await user.click(submitButton)
  },

  async fillAndSubmitLogin(email: string, password: string) {
    await this.fillLoginForm(email, password)
    await this.submitForm()
  },

  async clickButton(testId: string) {
    const user = userEvent.setup()
    const button = screen.getByTestId(testId)
    await user.click(button)
  },

  async typeInField(testId: string, text: string) {
    const user = userEvent.setup()
    const field = screen.getByTestId(testId)
    await user.clear(field)
    await user.type(field, text)
  },

  async selectOption(testId: string, option: string) {
    const user = userEvent.setup()
    const select = screen.getByTestId(testId)
    await user.selectOptions(select, option)
  }
}

// Assertion helpers
export const assertions = {
  async expectErrorMessage(message: string) {
    const errorElement = await screen.findByTestId('error-message')
    expect(errorElement).toHaveTextContent(message)
  },

  async expectSuccessMessage(message: string) {
    const successElement = await screen.findByTestId('success-message')
    expect(successElement).toHaveTextContent(message)
  },

  expectLoadingState() {
    const loadingElement = screen.getByTestId('loading-spinner')
    expect(loadingElement).toBeInTheDocument()
  },

  expectNoLoadingState() {
    const loadingElement = screen.queryByTestId('loading-spinner')
    expect(loadingElement).not.toBeInTheDocument()
  },

  async expectRedirect(path: string) {
    await waitFor(() => {
      expect(window.location.pathname).toBe(path)
    })
  },

  expectFormValidation(fieldTestId: string, errorMessage: string) {
    const errorElement = screen.getByTestId(`${fieldTestId}-error`)
    expect(errorElement).toHaveTextContent(errorMessage)
  },

  expectButtonDisabled(testId: string) {
    const button = screen.getByTestId(testId)
    expect(button).toBeDisabled()
  },

  expectButtonEnabled(testId: string) {
    const button = screen.getByTestId(testId)
    expect(button).not.toBeDisabled()
  }
}

// Mock localStorage
export function mockLocalStorage() {
  const store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get store() {
      return { ...store }
    }
  }
}

// Mock sessionStorage
export function mockSessionStorage() {
  return mockLocalStorage() // Same implementation
}

// Test data generators
export const testDataGenerators = {
  user(overrides: Partial<typeof mockUsers.admin> = {}) {
    return {
      ...mockUsers.admin,
      ...overrides
    }
  },

  product(overrides: any = {}) {
    return {
      id: 1,
      title: 'Test Product',
      slug: 'test-product',
      description: 'A test product',
      price: 99.99,
      variants: [],
      images: [],
      ...overrides
    }
  },

  order(overrides: any = {}) {
    return {
      id: 1,
      status: 'pending',
      total: 99.99,
      items: [],
      created_at: new Date().toISOString(),
      ...overrides
    }
  }
}

// Wait utilities
export const waitUtils = {
  async forElement(testId: string, timeout = 5000) {
    return await screen.findByTestId(testId, {}, { timeout })
  },

  async forText(text: string, timeout = 5000) {
    return await screen.findByText(text, {}, { timeout })
  },

  async forElementToDisappear(testId: string, timeout = 5000) {
    await waitFor(() => {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }, { timeout })
  },

  async forApiCall(mockFetch: jest.Mock, expectedCalls = 1, timeout = 5000) {
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(expectedCalls)
    }, { timeout })
  }
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { userEvent }
export { renderWithProviders as render }
export { renderHookWithProviders as renderHook }
