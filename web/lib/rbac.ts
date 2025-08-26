import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export interface UserClaims {
  sub: string
  role: string
  iat: number
  exp: number
}

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  OPERATIONS: 'operations',
  LOGISTICS: 'logistics',
  CUSTOMER: 'customer'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Role hierarchy - higher roles inherit permissions from lower ones
const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.ADMIN]: 100,
  [ROLES.SUPERVISOR]: 80,
  [ROLES.OPERATIONS]: 60,
  [ROLES.LOGISTICS]: 40,
  [ROLES.CUSTOMER]: 20,
}

// Permission definitions
export const PERMISSIONS = {
  // Product management
  PRODUCTS_VIEW: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERATIONS],
  PRODUCTS_CREATE: [ROLES.ADMIN, ROLES.SUPERVISOR],
  PRODUCTS_EDIT: [ROLES.ADMIN, ROLES.SUPERVISOR],
  PRODUCTS_DELETE: [ROLES.ADMIN],
  
  // Order management
  ORDERS_VIEW: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERATIONS, ROLES.LOGISTICS],
  ORDERS_EDIT: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERATIONS],
  ORDERS_CANCEL: [ROLES.ADMIN, ROLES.SUPERVISOR],
  ORDERS_FULFILL: [ROLES.OPERATIONS, ROLES.LOGISTICS],
  
  // User management
  USERS_VIEW: [ROLES.ADMIN, ROLES.SUPERVISOR],
  USERS_CREATE: [ROLES.ADMIN],
  USERS_EDIT: [ROLES.ADMIN],
  USERS_DELETE: [ROLES.ADMIN],
  
  // Analytics
  ANALYTICS_VIEW: [ROLES.ADMIN, ROLES.SUPERVISOR],
  
  // Settings
  SETTINGS_VIEW: [ROLES.ADMIN],
  SETTINGS_EDIT: [ROLES.ADMIN],
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Get user claims from JWT token
 */
export async function getUserClaims(request: NextRequest): Promise<UserClaims | null> {
  try {
    const token = cookies().get('mdv_token')?.value
    if (!token) return null
    
    // In production, verify with proper JWT_SECRET from environment
    const decoded = jwt.decode(token) as UserClaims
    if (!decoded || !decoded.sub || !decoded.role) return null
    
    // Check expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return null
    }
    
    return decoded
  } catch (error) {
    console.error('Failed to decode token:', error)
    return null
  }
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission]
  return allowedRoles.includes(userRole as never)
}

/**
 * Check if one role is higher than another in hierarchy
 */
export function isRoleHigherOrEqual(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB]
}

/**
 * Middleware to check if user has required role(s)
 */
export function requireRole(...allowedRoles: Role[]) {
  return async function middleware(request: NextRequest) {
    const claims = await getUserClaims(request)
    
    if (!claims) {
      return NextResponse.json(
        { error: 'Unauthorized: No valid authentication' },
        { status: 401 }
      )
    }
    
    if (!allowedRoles.includes(claims.role as Role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return null // Continue to the handler
  }
}

/**
 * Middleware to check if user has required permission
 */
export function requirePermission(permission: Permission) {
  return async function middleware(request: NextRequest) {
    const claims = await getUserClaims(request)
    
    if (!claims) {
      return NextResponse.json(
        { error: 'Unauthorized: No valid authentication' },
        { status: 401 }
      )
    }
    
    if (!hasPermission(claims.role as Role, permission)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return null // Continue to the handler
  }
}

/**
 * Check permissions for frontend components
 */
export function usePermission(userRole: string | undefined, permission: Permission): boolean {
  if (!userRole) return false
  return hasPermission(userRole as Role, permission)
}

/**
 * Check role hierarchy for frontend components
 */
export function useRoleCheck(userRole: string | undefined, requiredRole: Role): boolean {
  if (!userRole) return false
  return isRoleHigherOrEqual(userRole as Role, requiredRole)
}
