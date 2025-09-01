"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "../../lib/auth-context"

export default function NavigationAuth() {
  const { isAuthenticated, isStaff, isCustomer, user, logout, loading, getRoleDisplayName } = useAuth()
  const pathname = usePathname()
  
  // Check if staff is viewing customer pages
  const isStaffViewingCustomer = isStaff && (pathname.startsWith('/account') || pathname === '/' || pathname.startsWith('/men') || pathname.startsWith('/women') || pathname.startsWith('/essentials') || pathname.startsWith('/sale') || pathname.startsWith('/about'))

  if (loading) {
    return (
      <div className="hidden md:flex items-center gap-4 text-sm">
        <div className="w-16 h-4 bg-gray-200 animate-pulse rounded"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="hidden md:flex items-center gap-4 text-sm">
        <Link href="/customer-login" className="hover:text-maroon-700 transition-colors">
          Sign in
        </Link>
        <span className="text-neutral-400">|</span>
        <Link href="/register" className="hover:text-maroon-700 transition-colors">
          Register
        </Link>
      </div>
    )
  }

  // Staff viewing customer pages - show both customer account and admin access
  if (isStaffViewingCustomer) {
    return (
      <div className="hidden md:flex items-center gap-4 text-sm">
        <Link 
          href="/account" 
          className="hover:text-maroon-700 transition-colors"
        >
          Customer View
        </Link>
        <span className="text-neutral-400">|</span>
        <Link 
          href="/admin" 
          className="hover:text-maroon-700 transition-colors font-medium bg-maroon-50 px-2 py-1 rounded"
        >
          {getRoleDisplayName()}
        </Link>
        <span className="text-neutral-400">|</span>
        <button 
          onClick={logout}
          className="hover:text-maroon-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    )
  }

  // Staff on admin pages
  if (isStaff) {
    return (
      <div className="hidden md:flex items-center gap-4 text-sm">
        <Link 
          href="/admin" 
          className="hover:text-maroon-700 transition-colors font-medium"
        >
          {getRoleDisplayName()}
        </Link>
        <span className="text-neutral-400">|</span>
        <button 
          onClick={logout}
          className="hover:text-maroon-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    )
  }

  // Customer
  return (
    <div className="hidden md:flex items-center gap-4 text-sm">
      <Link 
        href="/account" 
        className="hover:text-maroon-700 transition-colors"
      >
        My Account
      </Link>
      <span className="text-neutral-400">|</span>
      <button 
        onClick={logout}
        className="hover:text-maroon-700 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
