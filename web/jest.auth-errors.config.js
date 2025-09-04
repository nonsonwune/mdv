/**
 * Jest Configuration for Auth Error Tests
 * 
 * Specialized configuration for running comprehensive auth error scenario tests
 * with proper mocking and browser environment simulation.
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Custom Jest configuration for auth error tests
const customJestConfig = {
  displayName: 'Auth Error Tests',
  testMatch: [
    '**/__tests__/**/auth-error*.test.{js,jsx,ts,tsx}',
    '**/**/auth-error*.test.{js,jsx,ts,tsx}'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.auth-setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
  },
  collectCoverageFrom: [
    'lib/auth-*.{js,ts,jsx,tsx}',
    'components/auth/**/*.{js,ts,jsx,tsx}',
    'hooks/use-auth*.{js,ts,jsx,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './lib/auth-context.tsx': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './lib/auth-error-messages.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testTimeout: 10000, // 10 seconds for integration tests
  verbose: true,
  // Browser environment simulation
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  // Mock modules that aren't available in test environment
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
}

// Export the Jest configuration
module.exports = createJestConfig(customJestConfig)
