// Client-side RBAC utilities
// Note: Server-side functionality moved to separate middleware files

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
 * Get user claims from JWT token (client-side)
 */
export function getUserClaimsFromToken(token: string): UserClaims | null {
  try {
    if (!token) return null

    // Decode JWT token (client-side, no verification)
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    const decoded = JSON.parse(jsonPayload) as UserClaims
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

// Server-side middleware functions moved to separate middleware files
// These are client-side utilities only

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
