import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected paths and their required roles
const PROTECTED_PATHS = {
  '/admin': ['admin', 'supervisor', 'operations', 'logistics'],
  '/account': ['customer', 'admin', 'supervisor', 'operations', 'logistics'], // Anyone authenticated
} as const

// Define role-specific restrictions
const ROLE_RESTRICTIONS = {
  '/admin/products': ['admin', 'supervisor', 'operations'],
  '/admin/users': ['admin'],
  '/admin/analytics': ['admin', 'supervisor'],
} as const

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path needs protection
  const protectedPath = Object.keys(PROTECTED_PATHS).find(path => 
    pathname.startsWith(path)
  )

  if (!protectedPath) {
    return NextResponse.next()
  }

  // Get user info from cookies
  const token = request.cookies.get('mdv_token')?.value
  const role = request.cookies.get('mdv_role')?.value

  // Temporary debugging - remove after fixing
  if (pathname.startsWith('/admin')) {
    console.log(`[MIDDLEWARE] Admin access attempt - Token: ${!!token}, Role: ${role}`)
  }

  // If no token, redirect to appropriate login
  if (!token) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(
        new URL('/staff-login?next=' + encodeURIComponent(pathname), request.url)
      )
    } else {
      return NextResponse.redirect(
        new URL('/customer-login?next=' + encodeURIComponent(pathname), request.url)
      )
    }
  }

  // Check basic role permissions for the protected path
  const requiredRoles = PROTECTED_PATHS[protectedPath as keyof typeof PROTECTED_PATHS]

  // Temporary debugging - remove after fixing
  if (pathname.startsWith('/admin')) {
    console.log(`[MIDDLEWARE] Role check - Required: [${requiredRoles.join(', ')}], User: ${role}, Match: ${role ? requiredRoles.includes(role as any) : false}`)
  }

  if (role && !requiredRoles.includes(role as any)) {
    // If customer tries to access admin, redirect to staff login
    if (pathname.startsWith('/admin') && role === 'customer') {
      return NextResponse.redirect(
        new URL('/staff-login?error=insufficient_permissions', request.url)
      )
    }
    
    // Otherwise, show forbidden
    return NextResponse.json(
      { error: 'Access denied. Insufficient permissions.' },
      { status: 403 }
    )
  }

  // Check specific role restrictions for admin sub-paths
  const restrictedPath = Object.keys(ROLE_RESTRICTIONS).find(path => 
    pathname.startsWith(path)
  )
  
  if (restrictedPath) {
    const allowedRoles = ROLE_RESTRICTIONS[restrictedPath as keyof typeof ROLE_RESTRICTIONS]
    if (role && !allowedRoles.includes(role as any)) {
      // Redirect to admin dashboard with error
      return NextResponse.redirect(
        new URL('/admin?error=insufficient_permissions', request.url)
      )
    }
  }

  return NextResponse.next()
}

// Configure which paths to run middleware on
export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
  ],
}

