"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "../../lib/auth-context"
import HeaderCart from "./HeaderCart"
import SearchBar from "./SearchBar"
import MobileNav from "../../components/navigation/MobileNav"
import NavigationAuth from "./NavigationAuth"
import DynamicNavigation from "../../components/navigation/DynamicNavigation"

export default function ConditionalNavigation() {
  const pathname = usePathname()
  const { isStaff, user } = useAuth()
  
  // Check if we're on an admin page
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/staff-login')
  
  // Show customer nav only if we're NOT on an admin page
  const showCustomerNav = !isAdminPage
  
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
            <Link href="/" className="flex items-center">
              <Image
                src="/images/mdv-logo-rlogomark-btext-nobg.png"
                alt="MDV - Maison De Valeur"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority={true}
              />
            </Link>
          </div>
          
          {/* Desktop Navigation - Dynamic */}
          <DynamicNavigation />
          
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
