"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "../../lib/auth-context"
import HeaderCart from "./HeaderCart"
import SearchBar from "./SearchBar"
import MobileNav from "../../components/navigation/MobileNav"
import NavigationAuth from "./NavigationAuth"

export default function ConditionalNavigation() {
  const pathname = usePathname()
  const { isStaff, user } = useAuth()
  
  // Check if we're on an admin page
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/staff-login')
  
  // Show customer nav if:
  // - Not on admin page, OR
  // - On admin page but user is viewing as customer (when they access /account, etc.)
  const showCustomerNav = !isAdminPage || (isStaff && pathname.startsWith('/account'))
  
  // If we shouldn't show customer nav, return null (no navigation)
  if (!showCustomerNav) {
    return null
  }
  
  return (
    <header className="border-b border-neutral-200 sticky top-0 bg-white/95 backdrop-blur z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center gap-4">
            <MobileNav />
            <Link href="/" className="text-xl font-semibold" style={{color: "var(--maroon-700)"}}>
              MDV
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/men" className="hover:text-maroon-700 transition-colors">Men</Link>
            <Link href="/women" className="hover:text-maroon-700 transition-colors">Women</Link>
            <Link href="/essentials" className="hover:text-maroon-700 transition-colors">Essentials</Link>
            <Link href="/sale" className="font-medium" style={{color: "var(--maroon-700)"}}>Sale</Link>
            <Link href="/about" className="hover:text-maroon-700 transition-colors">About</Link>
          </nav>
          
          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <SearchBar />
            <HeaderCart />
            {/* Desktop only account links */}
            <NavigationAuth />
          </div>
        </div>
      </div>
    </header>
  )
}
