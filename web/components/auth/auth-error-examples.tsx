/**
 * Auth Error Examples
 * 
 * Example implementations showing how to use the auth error handling system
 * in different scenarios and components.
 */

import React, { useState } from 'react'
import { AuthErrorDisplay } from './auth-error-display'
import { AuthErrorDialog, useAuthErrorDialog } from './auth-error-dialog'
import { getAuthErrorMessage, categorizeAuthError } from '../../lib/auth-error-messages'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'

/**
 * Example: Login Form with Error Handling
 */
export function LoginFormExample() {
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const { error: dialogError, isOpen, showError, hideError } = useAuthErrorDialog()

  const handleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate login request
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate different error scenarios
          const scenarios = [
            { status: 401, message: 'Invalid credentials' },
            { status: 429, message: 'Too many attempts' },
            { name: 'TypeError', message: 'fetch failed' },
            { status: 503, message: 'Service unavailable' }
          ]
          
          const randomError = scenarios[Math.floor(Math.random() * scenarios.length)]
          const error = new Error(randomError.message) as any
          if (randomError.status) error.status = randomError.status
          if (randomError.name) error.name = randomError.name
          
          reject(error)
        }, 1000)
      })
    } catch (loginError) {
      setError(loginError)
      // Also show in dialog for demonstration
      showError(loginError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login Example</CardTitle>
        <CardDescription>
          Demonstrates auth error handling in a login form
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <input
            type="email"
            placeholder="Email"
            value={credentials.email}
            onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md"
          />
          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        {error && (
          <AuthErrorDisplay 
            showRetryButton={true}
            showDismissButton={true}
          />
        )}

        <Button 
          onClick={handleLogin} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </Button>

        <AuthErrorDialog
          error={dialogError}
          open={isOpen}
          onClose={hideError}
          onRetry={handleLogin}
          showTechnicalDetails={true}
        />
      </CardContent>
    </Card>
  )
}

/**
 * Example: Error Message Showcase
 */
export function ErrorMessageShowcase() {
  const [selectedError, setSelectedError] = useState<string>('expired_session')
  const [context, setContext] = useState({ isStaff: false, retryCount: 0 })

  const errorTypes = [
    'expired_session',
    'invalid_credentials', 
    'network_error',
    'server_error',
    'permission_denied',
    'account_locked',
    'rate_limited',
    'maintenance_mode',
    'cors_error',
    'timeout',
    'invalid_token',
    'two_factor_required',
    'email_not_verified',
    'unknown_error'
  ]

  const errorMessage = getAuthErrorMessage(selectedError as any, context)

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Error Message Showcase</CardTitle>
        <CardDescription>
          Preview different auth error messages and their variations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Type Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Error Type:</label>
          <select
            value={selectedError}
            onChange={(e) => setSelectedError(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {errorTypes.map(type => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Context Controls */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={context.isStaff}
              onChange={(e) => setContext(prev => ({ ...prev, isStaff: e.target.checked }))}
            />
            Staff User
          </label>
          <label className="flex items-center gap-2">
            Retry Count:
            <input
              type="number"
              min="0"
              max="5"
              value={context.retryCount}
              onChange={(e) => setContext(prev => ({ ...prev, retryCount: parseInt(e.target.value) }))}
              className="w-16 px-2 py-1 border rounded"
            />
          </label>
        </div>

        <Separator />

        {/* Error Message Preview */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{errorMessage.title}</h3>
            <p className="text-muted-foreground">{errorMessage.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Action:</strong> {errorMessage.action}
            </div>
            <div>
              <strong>Severity:</strong> 
              <span className={`ml-1 px-2 py-1 rounded text-xs ${
                errorMessage.severity === 'error' ? 'bg-red-100 text-red-800' :
                errorMessage.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {errorMessage.severity.toUpperCase()}
              </span>
            </div>
            <div>
              <strong>Retryable:</strong> {errorMessage.retryable ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Icon:</strong> {errorMessage.icon}
            </div>
          </div>

          {errorMessage.helpUrl && (
            <div>
              <strong>Help URL:</strong> 
              <a href={errorMessage.helpUrl} className="ml-1 text-blue-600 hover:underline">
                {errorMessage.helpUrl}
              </a>
            </div>
          )}

          {errorMessage.troubleshooting && (
            <div>
              <strong>Troubleshooting Steps:</strong>
              <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                {errorMessage.troubleshooting.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-medium">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Example: Error Categorization Demo
 */
export function ErrorCategorizationDemo() {
  const [errorInput, setErrorInput] = useState('{"status": 401, "message": "Unauthorized"}')
  const [categorizedError, setCategorizedError] = useState<string>('')

  const handleCategorize = () => {
    try {
      const errorObj = JSON.parse(errorInput)
      const error = new Error(errorObj.message) as any
      if (errorObj.status) error.status = errorObj.status
      if (errorObj.name) error.name = errorObj.name
      
      const category = categorizeAuthError(error)
      setCategorizedError(category)
    } catch (e) {
      setCategorizedError('Invalid JSON input')
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Error Categorization Demo</CardTitle>
        <CardDescription>
          Test how different errors are categorized
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Error Object (JSON):</label>
          <textarea
            value={errorInput}
            onChange={(e) => setErrorInput(e.target.value)}
            className="w-full px-3 py-2 border rounded-md font-mono text-sm"
            rows={4}
            placeholder='{"status": 401, "message": "Unauthorized"}'
          />
        </div>

        <Button onClick={handleCategorize} className="w-full">
          Categorize Error
        </Button>

        {categorizedError && (
          <div className="p-3 bg-muted rounded-md">
            <strong>Category:</strong> {categorizedError}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <strong>Example inputs:</strong>
          <ul className="mt-1 space-y-1">
            <li>• {`{"name": "TypeError", "message": "fetch failed"}`}</li>
            <li>• {`{"status": 403, "message": "Forbidden"}`}</li>
            <li>• {`{"status": 429, "message": "Rate limited"}`}</li>
            <li>• {`{"message": "Token expired"}`}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Main Examples Page
 */
export function AuthErrorExamples() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Auth Error Handling Examples</h1>
        <p className="text-muted-foreground">
          Comprehensive examples of user-friendly authentication error handling
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <LoginFormExample />
        <ErrorCategorizationDemo />
      </div>

      <div className="flex justify-center">
        <ErrorMessageShowcase />
      </div>
    </div>
  )
}
