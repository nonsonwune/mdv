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

// Define staff roles
const STAFF_ROLES = ['admin', 'supervisor', 'operations', 'logistics']

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Computed values
  const isAuthenticated = user !== null
  const isStaff = user ? STAFF_ROLES.includes(user.role) : false
  const isCustomer = user ? !STAFF_ROLES.includes(user.role) : false

  // Check authentication status
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
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

// Hook for checking specific permissions
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

// Hook for role checking
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
