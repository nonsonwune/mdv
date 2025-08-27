'use client'

import React from 'react'
import { useAuth, Permission } from '@/lib/auth-context'

interface PermissionGuardProps {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Permission Guard Component
 * 
 * Conditionally renders children based on user's permission.
 * If user doesn't have permission, children are completely hidden (not just disabled).
 * 
 * @example
 * <PermissionGuard permission={Permission.PRODUCT_CREATE}>
 *   <button>Create Product</button>
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission } = useAuth()
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface MultiPermissionGuardProps {
  permissions: Permission[]
  requireAll?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Multi-Permission Guard Component
 * 
 * Checks multiple permissions at once.
 * Can require all permissions (AND) or any permission (OR).
 * 
 * @example
 * <MultiPermissionGuard 
 *   permissions={[Permission.PRODUCT_CREATE, Permission.PRODUCT_EDIT]}
 *   requireAll={false}
 * >
 *   <button>Manage Products</button>
 * </MultiPermissionGuard>
 */
export function MultiPermissionGuard({ 
  permissions, 
  requireAll = false,
  children, 
  fallback = null 
}: MultiPermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions } = useAuth()
  
  const hasAccess = requireAll 
    ? hasAllPermissions(...permissions)
    : hasAnyPermission(...permissions)
  
  if (!hasAccess) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface RoleGuardProps {
  roles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Role Guard Component
 * 
 * Conditionally renders children based on user's role.
 * Checks if user has any of the specified roles.
 * 
 * @example
 * <RoleGuard roles={['admin', 'supervisor']}>
 *   <button>Admin Action</button>
 * </RoleGuard>
 */
export function RoleGuard({ 
  roles, 
  children, 
  fallback = null 
}: RoleGuardProps) {
  const { isAnyRole } = useAuth()
  
  if (!isAnyRole(...roles)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface StaffOnlyGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Staff Only Guard Component
 * 
 * Only renders children for staff members (non-customer roles).
 * 
 * @example
 * <StaffOnlyGuard>
 *   <AdminDashboard />
 * </StaffOnlyGuard>
 */
export function StaffOnlyGuard({ 
  children, 
  fallback = null 
}: StaffOnlyGuardProps) {
  const { isStaff } = useAuth()
  
  if (!isStaff) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * Auth Guard Component
 * 
 * Only renders children for authenticated users.
 * Can optionally redirect to a login page.
 * 
 * @example
 * <AuthGuard redirectTo="/login">
 *   <ProtectedContent />
 * </AuthGuard>
 */
export function AuthGuard({ 
  children, 
  fallback = null,
  redirectTo
}: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth()
  
  React.useEffect(() => {
    if (!loading && !isAuthenticated && redirectTo) {
      window.location.href = redirectTo
    }
  }, [isAuthenticated, loading, redirectTo])
  
  if (loading) {
    return <div className="flex justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700"></div>
    </div>
  }
  
  if (!isAuthenticated) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
