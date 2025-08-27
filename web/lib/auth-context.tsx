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
   * Handles 401 errors gracefully - only logs non-authentication errors.
   * Used automatically on app startup and can be called manually to refresh state.
   */
  const checkAuth = async () => {
    try {
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
    getRoleDisplayName
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
 * Available permissions:
 * - view_admin: Access to admin dashboard
 * - manage_products: Create, edit, delete products
 * - manage_orders: View and manage orders
 * - manage_users: User administration (admin only)
 * - view_analytics: Access to analytics dashboard
 * - manage_fulfillment: Inventory and shipping management
 * 
 * @param permission - Permission name to check
 * @returns boolean indicating if user has permission
 * 
 * @example
 * const canManageProducts = usePermission('manage_products')
 * if (canManageProducts) {
 *   // Show product management UI
 * }
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth()
  if (!user) return false

  // Define permissions based on roles
  const permissions: Record<string, string[]> = {
    'view_admin': ['admin', 'supervisor', 'operations', 'logistics'],
    'manage_products': ['admin', 'supervisor'],
    'manage_orders': ['admin', 'supervisor', 'operations'],
    'manage_users': ['admin'],
    'view_analytics': ['admin', 'supervisor'],
    'manage_fulfillment': ['admin', 'operations', 'logistics'],
  }

  const allowedRoles = permissions[permission] || []
  return allowedRoles.includes(user.role)
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
