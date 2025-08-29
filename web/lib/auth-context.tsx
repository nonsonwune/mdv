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

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isStaff: boolean
  isCustomer: boolean
  loading: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  checkAuth: () => Promise<void>
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

  // Computed values
  const isAuthenticated = user !== null
  const isStaff = user ? STAFF_ROLES.includes(user.role) : false
  const isCustomer = user ? !STAFF_ROLES.includes(user.role) : false

  /**
   * Check Authentication Status
   *
   * Validates current session with the server and updates user state.
   * Only makes the request if there's likely a token present (to reduce 401 noise).
   * Handles 401 errors gracefully - only logs non-authentication errors.
   * Used automatically on app startup and can be called manually to refresh state.
   */
  const checkAuth = async () => {
    try {
      // Quick check: if document.cookie doesn't contain mdv_token, skip the request
      // This reduces unnecessary 401 requests for users who are definitely not logged in
      if (typeof document !== 'undefined' && !document.cookie.includes('mdv_token=')) {
        setUser(null)
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        // Silently handle 401 errors on public pages
        setUser(null)
        // Only log auth errors if they're not expected 401s
        if (response.status !== 401) {
          console.error('Auth check failed:', response.status)
        }
      }
    } catch (error) {
      // Only log network errors, not auth failures
      if (error instanceof TypeError) {
        console.error('Auth check network error:', error)
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Login function
  const login = (token: string, userData: User) => {
    setUser(userData)
    // Token is handled by httpOnly cookies, no need to store it locally
  }

  // Logout function
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      // Redirect to home page after logout
      window.location.href = '/'
    }
  }

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

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isStaff,
    isCustomer,
    loading,
    login,
    logout,
    checkAuth,
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
