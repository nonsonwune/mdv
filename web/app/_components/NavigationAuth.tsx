"use client"

import Link from "next/link"
import { useAuth } from "../../lib/auth-context"

export default function NavigationAuth() {
  const { isAuthenticated, isStaff, isCustomer, user, logout, loading, getRoleDisplayName } = useAuth()

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
