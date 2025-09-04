/**
 * Jest Setup for Auth Error Tests
 * 
 * Sets up the testing environment for comprehensive auth error scenario testing
 * including mocks, polyfills, and browser environment simulation.
 */

import '@testing-library/jest-dom'
import { jest } from '@jest/globals'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
})

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
})

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    // Suppress React error boundary errors in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Error boundaries') ||
       args[0].includes('The above error occurred'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    // Suppress specific warnings in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillUpdate'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
})

// Mock window.location
const locationMock = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}

Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
})

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn()
}

// Mock AbortController
if (!global.AbortController) {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }
    }
    
    abort() {
      this.signal.aborted = true
    }
  }
}

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
  writable: true,
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0))
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id))

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 0))
global.cancelIdleCallback = jest.fn(id => clearTimeout(id))

// Setup test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'

// Global test utilities
global.testUtils = {
  // Simulate different user agents
  setUserAgent: (userAgent) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      writable: true,
    })
  },
  
  // Simulate different viewport sizes
  setViewport: (width, height) => {
    Object.defineProperty(window, 'innerWidth', {
      value: width,
      writable: true,
    })
    Object.defineProperty(window, 'innerHeight', {
      value: height,
      writable: true,
    })
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
  },
  
  // Simulate network conditions
  setNetworkCondition: (condition) => {
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: condition, // '4g', '3g', '2g', 'slow-2g'
        downlink: condition === '4g' ? 10 : condition === '3g' ? 1.5 : 0.5,
        rtt: condition === '4g' ? 50 : condition === '3g' ? 150 : 300,
      },
      writable: true,
    })
  },
  
  // Simulate browser features
  setBrowserFeature: (feature, supported) => {
    switch (feature) {
      case 'localStorage':
        if (!supported) {
          Object.defineProperty(window, 'localStorage', {
            value: {
              getItem: () => { throw new Error('localStorage not supported') },
              setItem: () => { throw new Error('localStorage not supported') },
              removeItem: () => { throw new Error('localStorage not supported') },
            },
            writable: true,
          })
        }
        break
      case 'fetch':
        if (!supported) {
          delete global.fetch
        }
        break
      case 'clipboard':
        if (!supported) {
          delete navigator.clipboard
        }
        break
    }
  },
  
  // Reset all mocks
  resetMocks: () => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    sessionStorageMock.getItem.mockClear()
    sessionStorageMock.setItem.mockClear()
    sessionStorageMock.removeItem.mockClear()
    locationMock.assign.mockClear()
    locationMock.replace.mockClear()
    locationMock.reload.mockClear()
  },
}

// Reset mocks before each test
beforeEach(() => {
  global.testUtils.resetMocks()
  
  // Reset location
  locationMock.href = 'http://localhost:3000'
  locationMock.pathname = '/'
  locationMock.search = ''
  locationMock.hash = ''
  
  // Reset document.cookie
  document.cookie = ''
  
  // Reset user agent to default
  global.testUtils.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
  
  // Reset viewport to default
  global.testUtils.setViewport(1024, 768)
})
