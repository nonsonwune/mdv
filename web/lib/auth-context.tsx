/**
 * Authentication Context for MDV Application
 * 
 * Provides authentication state management and role-based access control.
 * Supports staff roles (admin, supervisor, operations, logistics) and customers.
 * 
 * Key Features:
 * - JWT token management via HTTP-only cookies
 * - Role-based permission system
 * - Graceful error handling for authentication failures
 * - Automatic session validation and cleanup
 * 
 * @see /docs/AUTHENTICATION.md for complete documentation
 */
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useErrorRecovery } from '../hooks/use-error-recovery'

// Permission enum matching backend permissions
export enum Permission {
  // Product permissions
  PRODUCT_VIEW = "product:view",
  PRODUCT_CREATE = "product:create",
  PRODUCT_EDIT = "product:edit",
  PRODUCT_DELETE = "product:delete",
  PRODUCT_PUBLISH = "product:publish",
  
  // Category permissions
  MANAGE_CATEGORIES = "category:manage",
  VIEW_CATEGORIES = "category:view",
  DELETE_CATEGORIES = "category:delete",
  
  // Inventory permissions
  INVENTORY_VIEW = "inventory:view",
  INVENTORY_ADJUST = "inventory:adjust",
  INVENTORY_SYNC = "inventory:sync",
  // Aliases for backend compatibility
  VIEW_INVENTORY = "inventory:view",
  MANAGE_INVENTORY = "inventory:adjust",
  
  // Order permissions
  ORDER_VIEW = "order:view",
  ORDER_CREATE = "order:create",
  ORDER_EDIT = "order:edit",
  ORDER_CANCEL = "order:cancel",
  ORDER_FULFILL = "order:fulfill",
  ORDER_REFUND = "order:refund",
  
  // User permissions
  USER_VIEW = "user:view",
  USER_CREATE = "user:create",
  USER_EDIT = "user:edit",
  USER_DELETE = "user:delete",
  USER_ACTIVATE = "user:activate",
  USER_ASSIGN_ROLE = "user:assign_role",
  // Aliases for backend compatibility
  MANAGE_USERS = "user:manage",
  VIEW_USERS = "user:view",
  DELETE_USERS = "user:delete",
  
  // Payment permissions
  PAYMENT_VIEW = "payment:view",
  PAYMENT_PROCESS = "payment:process",
  PAYMENT_REFUND = "payment:refund",
  
  // Report permissions
  REPORT_VIEW = "report:view",
  REPORT_GENERATE = "report:generate",
  REPORT_EXPORT = "report:export",
  // Aliases for backend compatibility
  VIEW_REPORTS = "report:view",
  VIEW_SALES_REPORTS = "report:view",
  VIEW_INVENTORY_REPORTS = "report:view",
  VIEW_CUSTOMER_REPORTS = "report:view",
  EXPORT_DATA = "report:export",
  
  // System permissions
  SYSTEM_SETTINGS = "system:settings",
  SYSTEM_AUDIT = "system:audit",
  SYSTEM_BACKUP = "system:backup",
  
  // Analytics permissions
  ANALYTICS_VIEW = "analytics:view",
  ANALYTICS_EXPORT = "analytics:export",
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
  phone?: string
}

interface AuthError {
  type: 'network' | 'expired' | 'invalid' | 'forbidden' | 'server' | 'unknown'
  message: string
  status?: number
  retryable: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isStaff: boolean
  isCustomer: boolean
  loading: boolean
  authError: AuthError | null
  isRetrying: boolean
  retryCount: number
  login: (token: string, userData: User) => void
  loginWithRetry: (credentials: { email: string; password: string }) => Promise<any>
  logout: () => void
  checkAuth: () => Promise<void>
  retryAuth: () => Promise<void>
  clearAuthError: () => void
  getRoleDisplayName: () => string
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (...permissions: Permission[]) => boolean
  hasAllPermissions: (...permissions: Permission[]) => boolean
  isRole: (role: string) => boolean
  isAnyRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Staff Roles Definition
 * 
 * All roles listed here have access to the admin dashboard with different permission levels:
 * - admin: Full system access, user management
 * - supervisor: Product and order management, analytics
 * - operations: Order management, inventory, fulfillment
 * - logistics: Inventory management, shipping, fulfillment
 * 
 * IMPORTANT: This list must match the role checking in /app/admin/layout.tsx
 * Any changes here should be reflected in the admin layout authentication.
 */
const STAFF_ROLES = ['admin', 'supervisor', 'operations', 'logistics']

// Role-Permission mapping (matching backend ROLE_PERMISSIONS)
const ROLE_PERMISSIONS: Record<string, Set<Permission>> = {
  admin: new Set(Object.values(Permission)), // Admins have all permissions
  
  supervisor: new Set([
    // Products - full access except delete
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_EDIT,
    Permission.PRODUCT_PUBLISH,
    // Categories
    Permission.MANAGE_CATEGORIES,
    Permission.VIEW_CATEGORIES,
    Permission.DELETE_CATEGORIES,
    // Inventory - full access
    Permission.INVENTORY_VIEW,
    Permission.VIEW_INVENTORY,
    Permission.INVENTORY_ADJUST,
    Permission.MANAGE_INVENTORY,
    Permission.INVENTORY_SYNC,
    // Orders - full access
    Permission.ORDER_VIEW,
    Permission.ORDER_CREATE,
    Permission.ORDER_EDIT,
    Permission.ORDER_CANCEL,
    Permission.ORDER_FULFILL,
    Permission.ORDER_REFUND,
    // Users - limited access
    Permission.USER_VIEW,
    Permission.VIEW_USERS,
    Permission.USER_CREATE,
    Permission.USER_EDIT,
    Permission.USER_ACTIVATE,
    Permission.MANAGE_USERS,
    Permission.DELETE_USERS,
    // Payments - view and process
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_PROCESS,
    Permission.PAYMENT_REFUND,
    // Reports - full access
    Permission.REPORT_VIEW,
    Permission.VIEW_REPORTS,
    Permission.VIEW_SALES_REPORTS,
    Permission.VIEW_INVENTORY_REPORTS,
    Permission.VIEW_CUSTOMER_REPORTS,
    Permission.REPORT_GENERATE,
    Permission.REPORT_EXPORT,
    Permission.EXPORT_DATA,
    // Analytics
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
  ]),
  
  operations: new Set([
    // Products - create/edit/delete
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_EDIT,
    Permission.PRODUCT_DELETE,
    // Categories
    Permission.VIEW_CATEGORIES,
    Permission.MANAGE_CATEGORIES,
    // Inventory - view and adjust
    Permission.INVENTORY_VIEW,
    Permission.VIEW_INVENTORY,
    Permission.INVENTORY_ADJUST,
    Permission.MANAGE_INVENTORY,
    // Orders - manage fulfillment
    Permission.ORDER_VIEW,
    Permission.ORDER_EDIT,
    Permission.ORDER_FULFILL,
    // Payments - view only
    Permission.PAYMENT_VIEW,
    // Reports - view only
    Permission.REPORT_VIEW,
    Permission.VIEW_REPORTS,
    Permission.VIEW_INVENTORY_REPORTS,
    // Analytics - view only
    Permission.ANALYTICS_VIEW,
  ]),
  
  logistics: new Set([
    // Products - view only
    Permission.PRODUCT_VIEW,
    // Inventory - view only
    Permission.INVENTORY_VIEW,
    Permission.VIEW_INVENTORY,
    // Orders - view and update shipping
    Permission.ORDER_VIEW,
    Permission.ORDER_EDIT,
    // Reports - view logistics reports
    Permission.REPORT_VIEW,
    Permission.VIEW_REPORTS,
    Permission.VIEW_INVENTORY_REPORTS,
    // Analytics - view logistics analytics
    Permission.ANALYTICS_VIEW,
  ]),
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<AuthError | null>(null)

  // Simple error logging for auth operations (no toast dependency)
  const logAuthError = useCallback((error: any, context: string) => {
    console.error(`Auth error in ${context}:`, error)
  }, [])

  // Computed values
  const isAuthenticated = user !== null
  const isStaff = user ? STAFF_ROLES.includes(user.role) : false
  const isCustomer = user ? !STAFF_ROLES.includes(user.role) : false

  // Temporary debugging - remove after fixing
  if (user && !isStaff) {
    console.log('[AUTH CONTEXT] User role check failed:', {
      userRole: user.role,
      userRoleType: typeof user.role,
      staffRoles: STAFF_ROLES,
      includes: STAFF_ROLES.includes(user.role),
      userEmail: user.email
    })
  }

  // Helper to detect if we're on a protected page that likely needs auth
  const isProtectedPage = () => {
    if (typeof window === 'undefined') return false
    const path = window.location.pathname
    return path.startsWith('/admin') || path.startsWith('/account') || path.startsWith('/checkout')
  }

  // Helper to categorize auth errors
  const categorizeAuthError = useCallback((error: any): AuthError => {
    // Network errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection failed. Please check your internet connection.',
        retryable: true
      }
    }

    // HTTP status-based errors
    if (error.status) {
      switch (error.status) {
        case 401:
          return {
            type: 'expired',
            message: 'Your session has expired. Please log in again.',
            status: 401,
            retryable: false
          }
        case 403:
          return {
            type: 'forbidden',
            message: 'Access denied. You do not have permission to access this resource.',
            status: 403,
            retryable: false
          }
        case 408:
        case 429:
        case 502:
        case 503:
        case 504:
          return {
            type: 'server',
            message: 'Server temporarily unavailable. Please try again in a moment.',
            status: error.status,
            retryable: true
          }
        case 500:
          return {
            type: 'server',
            message: 'Server error occurred. Please try again later.',
            status: 500,
            retryable: false
          }
        default:
          return {
            type: 'invalid',
            message: 'Authentication failed. Please try logging in again.',
            status: error.status,
            retryable: false
          }
      }
    }

    // Generic errors
    return {
      type: 'unknown',
      message: 'An unexpected error occurred. Please try again.',
      retryable: true
    }
  }, [])

  // Helper to check if we should attempt auth check
  const shouldCheckAuth = () => {
    if (typeof window === 'undefined') return true // SSR - always check

    // Always check on protected pages
    if (isProtectedPage()) return true

    // Check if we have any indication of being logged in
    // Look for non-httpOnly cookies that might indicate auth state
    const hasRoleIndicator = document.cookie.includes('mdv_role=')
    if (hasRoleIndicator) return true

    // Check localStorage for any auth-related data
    try {
      const hasAuthData = localStorage.getItem('auth_hint') === 'true'
      if (hasAuthData) return true
    } catch (e) {
      // localStorage not available
    }

    // For public pages with no auth indicators, skip auth check
    return false
  }

  // Enhanced error recovery for auth operations with automatic retry
  const authRecovery = useErrorRecovery(
    async () => {
      await performAuthCheck()
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      autoRetry: true, // Enable automatic retry for network errors
      retryCondition: (error) => {
        const authErr = categorizeAuthError(error)

        // Auto-retry network errors and temporary server errors
        if (authErr.type === 'network' ||
            (authErr.type === 'server' && authErr.retryable)) {
          return true
        }

        // Don't auto-retry auth failures, expired sessions, or forbidden access
        return false
      },
      onRetrySuccess: () => {
        setAuthError(null)
        console.log('Auth check retry succeeded')
      },
      onRetryFailure: (error, attempt) => {
        const authErr = categorizeAuthError(error)
        setAuthError(authErr)

        console.warn(`Auth check retry ${attempt} failed:`, authErr.message)

        // Log final failure or non-retryable errors
        if (attempt >= 3 || !authErr.retryable) {
          logAuthError(error, 'auth-check')
        }
      },
      circuitBreakerThreshold: 5, // Open circuit after 5 failures in a minute
      circuitBreakerTimeout: 60000, // Reset circuit after 1 minute
      onCircuitOpen: () => {
        console.warn('Auth circuit breaker opened - too many failures')
        setAuthError({
          type: 'server',
          message: 'Authentication service temporarily unavailable. Please try again in a moment.',
          retryable: false
        })
      },
      onCircuitClose: () => {
        console.log('Auth circuit breaker closed - service recovered')
        setAuthError(null)
      }
    }
  )

  // Core auth check function
  const performAuthCheck = useCallback(async () => {
    const response = await fetch('/api/auth/check', {
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    if (!response.ok) {
      const error = new Error(`Auth check failed: ${response.status}`)
      ;(error as any).status = response.status
      throw error
    }

    const userData = await response.json()
    setUser(userData.user)
    setAuthError(null) // Clear any previous errors
    return userData.user
  }, [])

  /**
   * Check Authentication Status
   *
   * Enhanced with better error handling, retry mechanisms, and graceful degradation.
   * Validates current session with the server and updates user state.
   * Handles network errors, expired sessions, and server issues appropriately.
   */
  const checkAuth = useCallback(async () => {
    // Skip auth check if we're on a public page with no auth indicators
    if (!shouldCheckAuth()) {
      setLoading(false)
      return
    }

    try {
      await performAuthCheck()
    } catch (error) {
      const authErr = categorizeAuthError(error)
      setAuthError(authErr)
      setUser(null)

      // Handle different error types appropriately
      switch (authErr.type) {
        case 'expired':
          // Session expired - clear auth hints and redirect if on protected page
          try {
            localStorage.removeItem('auth_hint')
          } catch (e) {
            // localStorage not available
          }

          if (isProtectedPage()) {
            // Redirect to login for protected pages
            window.location.href = '/login?expired=true'
            return
          }
          break

        case 'network':
          // Network error - will be retryable
          if (authErr.retryable) {
            authRecovery.handleError(error)
          }
          break

        case 'server':
          // Server error - may be retryable
          if (authErr.retryable) {
            authRecovery.handleError(error)
          } else {
            logAuthError(error, 'server-error')
          }
          break

        default:
          // Other errors - log but don't show intrusive messages on public pages
          if (isProtectedPage()) {
            logAuthError(error, 'protected-page')
          }
      }
    } finally {
      setLoading(false)
    }
  }, [shouldCheckAuth, performAuthCheck, categorizeAuthError, authRecovery, logAuthError, isProtectedPage])

  // Retry auth check
  const retryAuth = useCallback(async () => {
    if (authRecovery.canRetry) {
      await authRecovery.retry()
    } else {
      // Force a fresh auth check
      await checkAuth()
    }
  }, [authRecovery, checkAuth])

  // Clear auth error
  const clearAuthError = useCallback(() => {
    setAuthError(null)
    authRecovery.reset()
  }, [authRecovery])

  // Enhanced login function with retry support
  const loginWithRetry = useCallback(async (credentials: { email: string; password: string }) => {
    const loginRecovery = useErrorRecovery(
      async () => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(credentials)
        })

        if (!response.ok) {
          const error = new Error(`Login failed: ${response.status}`)
          ;(error as any).status = response.status
          throw error
        }

        const data = await response.json()
        return data
      },
      {
        maxRetries: 2, // Fewer retries for login attempts
        retryDelay: 2000,
        exponentialBackoff: true,
        autoRetry: false, // Manual retry only for login
        retryCondition: (error) => {
          const authErr = categorizeAuthError(error)
          // Only retry network errors and temporary server errors for login
          return authErr.type === 'network' ||
                 (authErr.type === 'server' && authErr.retryable)
        }
      }
    )

    try {
      const result = await loginRecovery.execute()
      login(result.token, result.user)
      return result
    } catch (error) {
      const authErr = categorizeAuthError(error)
      setAuthError(authErr)
      throw error
    }
  }, [categorizeAuthError])

  // Basic login function (for direct token/user data)
  const login = useCallback((token: string, userData: User) => {
    setUser(userData)
    setAuthError(null) // Clear any auth errors
    authRecovery.reset() // Reset recovery state

    // Token is handled by httpOnly cookies, no need to store it locally
    // Set auth hint for future optimized auth checks
    try {
      localStorage.setItem('auth_hint', 'true')
    } catch (e) {
      // localStorage not available
    }
  }, [authRecovery])

  // Enhanced logout function with better error handling
  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      // Even if logout fails on server, clear local state
      if (!response.ok) {
        console.warn('Logout request failed, but clearing local state')
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with local cleanup even if server request fails
    } finally {
      // Always clear local state
      setUser(null)
      setAuthError(null)
      authRecovery.reset()

      // Clear auth hint
      try {
        localStorage.removeItem('auth_hint')
      } catch (e) {
        // localStorage not available
      }

      // Redirect to home page after logout
      window.location.href = '/'
    }
  }, [authRecovery])

  // Get role display name for UI
  const getRoleDisplayName = (): string => {
    if (!user) return 'Guest'
    
    switch (user.role) {
      case 'admin':
        return 'Admin'
      case 'supervisor':
        return 'Supervisor'
      case 'operations':
        return 'Operations'
      case 'logistics':
        return 'Logistics'
      case 'customer':
        return 'My Account'
      default:
        return user.role.charAt(0).toUpperCase() + user.role.slice(1)
    }
  }

  // Permission checking methods
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false
    const rolePerms = ROLE_PERMISSIONS[user.role]
    return rolePerms?.has(permission) || false
  }

  const hasAnyPermission = (...permissions: Permission[]): boolean => {
    if (!user) return false
    const rolePerms = ROLE_PERMISSIONS[user.role]
    return permissions.some(perm => rolePerms?.has(perm))
  }

  const hasAllPermissions = (...permissions: Permission[]): boolean => {
    if (!user) return false
    const rolePerms = ROLE_PERMISSIONS[user.role]
    return permissions.every(perm => rolePerms?.has(perm))
  }

  const isRole = (role: string): boolean => {
    return user?.role === role
  }

  const isAnyRole = (...roles: string[]): boolean => {
    return roles.includes(user?.role || '')
  }

  // Check auth on mount with smart timing
  useEffect(() => {
    // For protected pages, check auth immediately
    // For public pages, add a small delay to reduce console noise
    const delay = isProtectedPage() ? 0 : 200

    const timer = setTimeout(() => {
      checkAuth()
    }, delay)

    return () => clearTimeout(timer)
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isStaff,
    isCustomer,
    loading,
    authError,
    isRetrying: authRecovery.isRetrying,
    retryCount: authRecovery.retryCount,
    login,
    loginWithRetry,
    logout,
    checkAuth,
    retryAuth,
    clearAuthError,
    getRoleDisplayName,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    isAnyRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Permission Hook
 * 
 * Checks if the current user has a specific permission based on their role.
 * Returns false if user is not authenticated.
 * 
 * @param permission - Permission to check
 * @returns boolean indicating if user has permission
 * 
 * @example
 * const canCreateProducts = usePermission(Permission.PRODUCT_CREATE)
 * if (canCreateProducts) {
 *   // Show product creation UI
 * }
 */
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

/**
 * Role Hierarchy Hook
 * 
 * Checks if the current user meets or exceeds a required role level.
 * Uses hierarchical role system where higher roles include lower role permissions.
 * 
 * Role hierarchy (lowest to highest):
 * customer (1) < logistics (2) < operations (3) < supervisor (4) < admin (5)
 * 
 * @param requiredRole - Minimum role required
 * @returns boolean indicating if user meets role requirement
 * 
 * @example
 * const canAccessAdminFeatures = useRole('operations')
 * // True for operations, supervisor, and admin roles
 */
export function useRole(requiredRole: string): boolean {
  const { user } = useAuth()
  if (!user) return false

  const roleHierarchy: Record<string, number> = {
    'customer': 1,
    'logistics': 2,
    'operations': 3,
    'supervisor': 4,
    'admin': 5
  }

  const userLevel = roleHierarchy[user.role] || 0
  const requiredLevel = roleHierarchy[requiredRole] || 0

  return userLevel >= requiredLevel
}

/**
 * Auth Error Hook
 *
 * Provides utilities for handling authentication errors in components.
 * Includes retry mechanisms and user-friendly error messages.
 *
 * @example
 * const { authError, canRetry, retryAuth, clearError } = useAuthError()
 *
 * if (authError) {
 *   return (
 *     <div>
 *       <p>{authError.message}</p>
 *       {canRetry && <button onClick={retryAuth}>Retry</button>}
 *       <button onClick={clearError}>Dismiss</button>
 *     </div>
 *   )
 * }
 */
export function useAuthError() {
  const { authError, isRetrying, retryCount, retryAuth, clearAuthError } = useAuth()

  const canRetry = authError?.retryable && !isRetrying && retryCount < 3

  const getErrorSeverity = (): 'error' | 'warning' | 'info' => {
    if (!authError) return 'info'

    switch (authError.type) {
      case 'expired':
        return 'info'
      case 'network':
      case 'server':
        return 'warning'
      case 'forbidden':
      case 'invalid':
      case 'unknown':
      default:
        return 'error'
    }
  }

  const getRetryMessage = (): string => {
    if (!authError?.retryable) return ''

    if (isRetrying) {
      return `Retrying... (attempt ${retryCount + 1})`
    }

    if (retryCount > 0) {
      return `Retry failed ${retryCount} time${retryCount > 1 ? 's' : ''}. Try again?`
    }

    return 'Click to retry'
  }

  return {
    authError,
    isRetrying,
    retryCount,
    canRetry,
    retryAuth,
    clearError: clearAuthError,
    severity: getErrorSeverity(),
    retryMessage: getRetryMessage(),
    hasError: !!authError
  }
}
