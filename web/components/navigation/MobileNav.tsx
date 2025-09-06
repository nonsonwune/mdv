"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { useAuth } from "../../lib/auth-context"
import { DynamicMobileNavigation } from "./DynamicNavigation"
import SearchBar from "../../app/_components/SearchBar"
import {
  HomeIcon,
  UserIcon,
  InformationCircleIcon,
  PhoneIcon,
  TruckIcon,
  QuestionMarkCircleIcon,
  ArrowLeftOnRectangleIcon,
  UserGroupIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

interface MobileNavProps {
  cartCount?: number
}

export default function MobileNav({ cartCount = 0 }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { isAuthenticated, isStaff, isCustomer, user, logout, getRoleDisplayName } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Close menu on route change
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Remove hardcoded menu items - now using dynamic navigation

  const getAccountItems = () => {
    if (!isAuthenticated) {
      return [
        { label: "Customer Sign In", href: "/customer-login", icon: "👤" },
        { label: "Staff Portal", href: "/staff-login", icon: "👔" },
        { label: "Track Order", href: "/track", icon: "📍" },
      ]
    }
    
    // Check if staff is viewing customer pages
    const isStaffViewingCustomer = isStaff && (
      pathname.startsWith('/account') ||
      pathname === '/' ||
      pathname.startsWith('/men') ||
      pathname.startsWith('/women') ||
      pathname.startsWith('/essentials') ||
      pathname.startsWith('/sale') ||
      pathname.startsWith('/about')
    )
    
    // Staff viewing customer pages - show both contexts
    if (isStaffViewingCustomer) {
      return [
        { label: "Customer View", href: "/account", icon: "👁️" },
        { label: "Orders", href: "/account?tab=orders", icon: "📦" },
        { label: "Track Order", href: "/track", icon: "📍" },
        { label: "━━━━━━━━━━", href: "#", icon: "" }, // Divider
        { label: `Admin: ${getRoleDisplayName()}`, href: "/admin", icon: "🔑" },
        { label: "Admin Dashboard", href: "/admin", icon: "📊" },
        { label: "Sign Out", href: "#", icon: "🚪", onClick: logout },
      ]
    }
    
    // Staff on admin pages
    if (isStaff) {
      return [
        { label: getRoleDisplayName(), href: "/admin", icon: "📊" },
        { label: "Orders", href: "/admin/orders", icon: "📦" },
        { label: "Customer View", href: "/account", icon: "👁️" },
        { label: "Sign Out", href: "#", icon: "🚪", onClick: logout },
      ]
    }
    
    // Customer
    return [
      { label: "My Account", href: "/account", icon: "👤" },
      { label: "Orders", href: "/account?tab=orders", icon: "📦" },
      { label: "Track Order", href: "/track", icon: "📍" },
      { label: "Sign Out", href: "#", icon: "🚪", onClick: logout },
    ]
  }
  
  const accountItems = getAccountItems()

  const infoItems = [
    { label: "About Us", href: "/about", icon: "ℹ️" },
    { label: "Contact", href: "/contact", icon: "📞" },
    { label: "Shipping & Returns", href: "/shipping", icon: "📦" },
    { label: "Size Guide", href: "/size-guide", icon: "📏" },
    { label: "FAQ", href: "/faq", icon: "❓" },
  ]

  if (!mounted) return null

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 -m-2 rounded-lg hover:bg-neutral-100 transition-colors"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <div className="w-6 h-5 flex flex-col justify-between">
          <span
            className={`block h-0.5 w-full bg-current transform transition-all duration-300 ${
              isOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-full bg-current transition-all duration-300 ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-full bg-current transform transition-all duration-300 ${
              isOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </div>
      </button>

      {/* Mobile Menu Overlay */}
      {createPortal(
        <div
          className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
            isOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-300 ${
              isOpen ? "opacity-50" : "opacity-0"
            }`}
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div
            className={`absolute left-0 top-0 h-full w-80 md:w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out safe-area-inset ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <Link href="/" className="text-xl font-bold text-maroon-700">
                  MDV
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="lg:hidden"
                  aria-label="Close menu"
                >
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-4 overflow-y-auto">
                {/* Search Section */}
                <div className="mb-6">
                  <div className="px-3 py-2 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Search
                    </h3>
                  </div>
                  <div className="px-3">
                    <SearchBar
                      isMobile={true}
                      onClose={() => setIsOpen(false)}
                      autoFocus={false}
                    />
                  </div>
                </div>

                {/* Cart Section */}
                <div className="mb-6">
                  <div className="px-3 py-2 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Cart
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="/cart"
                      className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-base md:text-sm font-medium transition-colors group min-h-[44px] ${
                        pathname === '/cart'
                          ? 'bg-maroon-50 text-maroon-700 border border-maroon-200'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <svg className={`h-5 w-5 ${pathname === '/cart' ? 'text-maroon-600' : 'text-gray-500 group-hover:text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      <span className="flex-1">View Cart</span>
                      {cartCount > 0 && (
                        <span className="bg-maroon-600 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                          {cartCount}
                        </span>
                      )}
                      {pathname === '/cart' && (
                        <div className="w-2 h-2 bg-maroon-600 rounded-full"></div>
                      )}
                    </Link>
                  </div>
                </div>

                {/* Shop Section */}
                <div className="mb-6">
                  <div className="px-3 py-2 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Shop
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="/"
                      className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-base md:text-sm font-medium transition-colors group min-h-[44px] ${
                        pathname === '/'
                          ? 'bg-maroon-50 text-maroon-700 border border-maroon-200'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <HomeIcon className={`h-5 w-5 ${pathname === '/' ? 'text-maroon-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                      <span className="flex-1">Home</span>
                      {pathname === '/' && (
                        <div className="w-2 h-2 bg-maroon-600 rounded-full"></div>
                      )}
                    </Link>
                    <DynamicMobileNavigation />
                  </div>
                </div>

                {/* Account Section */}
                <div className="mb-6">
                  <div className="px-3 py-2 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Account
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {accountItems.map((item) => {
                      if (item.href === "#" && item.label.includes("━")) {
                        // Divider
                        return (
                          <div key={item.label} className="px-3 py-1 text-center text-gray-300 text-xs">
                            {item.label}
                          </div>
                        )
                      }

                      const getIcon = (iconText: string) => {
                        switch (iconText) {
                          case "👤": return <UserIcon className="h-5 w-5" />
                          case "📦": return <ClipboardDocumentListIcon className="h-5 w-5" />
                          case "📍": return <MapPinIcon className="h-5 w-5" />
                          case "🚪": return <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                          case "👁️": return <EyeIcon className="h-5 w-5" />
                          case "📊": return <ClipboardDocumentListIcon className="h-5 w-5" />
                          case "🔑": return <UserGroupIcon className="h-5 w-5" />
                          default: return <UserIcon className="h-5 w-5" />
                        }
                      }

                      const isActive = pathname === item.href ||
                        (item.href.includes('?tab=') && pathname === item.href.split('?')[0])

                      if (item.onClick) {
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              setIsOpen(false)
                              item.onClick!()
                            }}
                            className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-base md:text-sm font-medium transition-colors group min-h-[44px] w-full text-left ${
                              isActive
                                ? 'bg-maroon-50 text-maroon-700 border border-maroon-200'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <span className={`${isActive ? 'text-maroon-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                              {getIcon(item.icon)}
                            </span>
                            <span className="flex-1">{item.label}</span>
                            {isActive && (
                              <div className="w-2 h-2 bg-maroon-600 rounded-full"></div>
                            )}
                          </button>
                        )
                      }

                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href as any}
                          className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-base md:text-sm font-medium transition-colors group min-h-[44px] ${
                            isActive
                              ? 'bg-maroon-50 text-maroon-700 border border-maroon-200'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className={`${isActive ? 'text-maroon-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                            {getIcon(item.icon)}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {isActive && (
                            <div className="w-2 h-2 bg-maroon-600 rounded-full"></div>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Information Section */}
                <div>
                  <div className="px-3 py-2 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Information
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {infoItems.map((item) => {
                      const getIcon = (iconText: string) => {
                        switch (iconText) {
                          case "ℹ️": return <InformationCircleIcon className="h-5 w-5" />
                          case "📞": return <PhoneIcon className="h-5 w-5" />
                          case "📦": return <TruckIcon className="h-5 w-5" />
                          case "📏": return <InformationCircleIcon className="h-5 w-5" />
                          case "❓": return <QuestionMarkCircleIcon className="h-5 w-5" />
                          default: return <InformationCircleIcon className="h-5 w-5" />
                        }
                      }

                      const isActive = pathname === item.href

                      return (
                        <Link
                          key={item.href}
                          href={item.href as any}
                          className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-base md:text-sm font-medium transition-colors group min-h-[44px] ${
                            isActive
                              ? 'bg-maroon-50 text-maroon-700 border border-maroon-200'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className={`${isActive ? 'text-maroon-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                            {getIcon(item.icon)}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {isActive && (
                            <div className="w-2 h-2 bg-maroon-600 rounded-full"></div>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </nav>

              {/* Contact Info & User Section */}
              <div className="p-4 border-t border-gray-200">
                {/* User info if authenticated */}
                {isAuthenticated && user && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    {user.role && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-maroon-100 text-maroon-700 rounded capitalize">
                        {user.role}
                      </span>
                    )}
                  </div>
                )}

                {/* Contact Info */}
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">WhatsApp Support:</p>
                  <a
                    href="https://wa.me/+2348136514087"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-maroon-700 hover:text-maroon-800 transition-colors"
                  >
                    +234 813 651 4087
                  </a>
                  <p className="text-xs text-gray-500 mt-1">
                    Monday - Saturday<br />
                    9:00 AM - 6:00 PM WAT
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
