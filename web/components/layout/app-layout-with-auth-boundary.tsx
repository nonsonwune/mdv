/**
 * App Layout with Auth Error Boundary
 * 
 * Example implementation showing how to integrate the AuthErrorBoundary
 * with the main app layout for comprehensive error handling.
 */

import React, { ReactNode } from 'react'
import { AuthErrorBoundary, ProtectedRouteErrorBoundary } from '../auth/auth-error-boundary'
import { AuthErrorDisplay } from '../auth/auth-error-display'
import { useAuth } from '../../lib/auth-context'

interface AppLayoutProps {
  children: ReactNode
  isProtectedRoute?: boolean
  showAuthStatus?: boolean
  className?: string
}

/**
 * Main App Layout with integrated auth error handling
 */
export function AppLayoutWithAuthBoundary({
  children,
  isProtectedRoute = false,
  showAuthStatus = false,
  className = ''
}: AppLayoutProps) {
  const { loading } = useAuth()

  // Choose appropriate error boundary based on route type
  const ErrorBoundaryComponent = isProtectedRoute 
    ? ProtectedRouteErrorBoundary 
    : AuthErrorBoundary

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Global auth error display */}
      <div className="sticky top-0 z-50">
        <AuthErrorDisplay compact />
      </div>

      {/* Main content with error boundary */}
      <ErrorBoundaryComponent
        onError={(error, errorInfo) => {
          // Log to error tracking service
          console.error('App-level auth error:', error, errorInfo)
          
          // Report to analytics
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'exception', {
              description: error.message,
              fatal: false
            })
          }
        }}
        showRetry={true}
        showNavigation={true}
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {showAuthStatus && (
              <div className="border-b bg-muted/50 px-4 py-2">
                <AuthStatusIndicator />
              </div>
            )}
            {children}
          </>
        )}
      </ErrorBoundaryComponent>
    </div>
  )
}

/**
 * Protected Route Wrapper
 * 
 * Wraps protected routes with appropriate error boundary and auth checks.
 */
export function ProtectedRouteWrapper({ 
  children, 
  requiredRole,
  fallback
}: {
  children: ReactNode
  requiredRole?: string
  fallback?: ReactNode
}) {
  const { isAuthenticated, user, hasPermission } = useAuth()

  // Check authentication
  if (!isAuthenticated) {
    return (
      <ProtectedRouteErrorBoundary>
        {fallback || (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-4">
                Please log in to access this page.
              </p>
              <button
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
      </ProtectedRouteErrorBoundary>
    )
  }

  // Check role-based permissions
  if (requiredRole && user && !hasPermission(requiredRole as any)) {
    return (
      <AuthErrorBoundary>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You do not have permission to access this page.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md"
            >
              Go Home
            </button>
          </div>
        </div>
      </AuthErrorBoundary>
    )
  }

  return (
    <ProtectedRouteErrorBoundary>
      {children}
    </ProtectedRouteErrorBoundary>
  )
}

/**
 * Auth Status Indicator Component
 */
function AuthStatusIndicator() {
  const { isAuthenticated, user, authError, isRetrying } = useAuth()

  if (authError) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <div className="w-2 h-2 rounded-full bg-destructive" />
        Auth Error: {authError.message}
        {isRetrying && <span className="text-muted-foreground">(Retrying...)</span>}
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        Authenticated as {user.name} ({user.role})
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
      Not authenticated
    </div>
  )
}

/**
 * Example usage in Next.js pages
 */

// For public pages
export function PublicPageLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayoutWithAuthBoundary isProtectedRoute={false}>
      {children}
    </AppLayoutWithAuthBoundary>
  )
}

// For protected pages
export function ProtectedPageLayout({ 
  children, 
  requiredRole 
}: { 
  children: ReactNode
  requiredRole?: string 
}) {
  return (
    <AppLayoutWithAuthBoundary isProtectedRoute={true}>
      <ProtectedRouteWrapper requiredRole={requiredRole}>
        {children}
      </ProtectedRouteWrapper>
    </AppLayoutWithAuthBoundary>
  )
}

// For admin pages
export function AdminPageLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedPageLayout requiredRole="admin">
      {children}
    </ProtectedPageLayout>
  )
}

/**
 * HOC for pages that need auth error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    isProtectedRoute?: boolean
    requiredRole?: string
    showAuthStatus?: boolean
  } = {}
) {
  const WrappedComponent = (props: P) => (
    <AppLayoutWithAuthBoundary 
      isProtectedRoute={options.isProtectedRoute}
      showAuthStatus={options.showAuthStatus}
    >
      {options.requiredRole ? (
        <ProtectedRouteWrapper requiredRole={options.requiredRole}>
          <Component {...props} />
        </ProtectedRouteWrapper>
      ) : (
        <Component {...props} />
      )}
    </AppLayoutWithAuthBoundary>
  )

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Example usage:
 * 
 * // Public page
 * export default withAuthErrorBoundary(HomePage)
 * 
 * // Protected page
 * export default withAuthErrorBoundary(DashboardPage, { 
 *   isProtectedRoute: true 
 * })
 * 
 * // Admin page
 * export default withAuthErrorBoundary(AdminPage, { 
 *   isProtectedRoute: true,
 *   requiredRole: 'admin',
 *   showAuthStatus: true
 * })
 */
