"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { useAuth } from "../../lib/auth-context"

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

  const menuItems = [
    { label: "Home", href: "/", icon: "🏠" },
    { label: "Men", href: "/men", icon: "👔" },
    { label: "Women", href: "/women", icon: "👗" },
    { label: "Essentials", href: "/essentials", icon: "✨" },
    { label: "Sale", href: "/sale", icon: "🏷️", accent: true },
  ]

  const getAccountItems = () => {
    if (!isAuthenticated) {
      return [
        { label: "Customer Sign In", href: "/customer-login", icon: "👤" },
        { label: "Staff Portal", href: "/staff-login", icon: "👔" },
        { label: "Track Order", href: "/track", icon: "📍" },
      ]
    }
    
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
            className={`absolute left-0 top-0 h-full w-[280px] bg-white shadow-xl transform transition-transform duration-300 ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <Link href="/" className="text-xl font-semibold" style={{ color: "var(--maroon-700)" }}>
                MDV
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 -m-2 rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 73px)" }}>
              {/* Search Bar */}
              <div className="p-4 border-b border-neutral-100">
                <form action="/search" method="GET" className="relative">
                  <input
                    type="search"
                    name="query"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-maroon-700"
                  />
                  <svg
                    className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </form>
              </div>

              {/* Cart Link */}
              <div className="p-4 border-b border-neutral-100">
                <Link
                  href="/cart"
                  className="flex items-center justify-between p-3 bg-maroon-50 rounded-lg hover:bg-maroon-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">🛒</span>
                    <span className="font-medium" style={{ color: "var(--maroon-700)" }}>
                      View Cart
                    </span>
                  </span>
                  {cartCount > 0 && (
                    <span className="bg-maroon-700 text-white text-xs px-2 py-1 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Main Navigation */}
              <nav className="p-4">
                <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-2">Shop</h3>
                <ul className="space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href as any}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors ${
                          pathname === item.href ? "bg-neutral-100" : ""
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span
                          className={`font-medium ${item.accent ? "text-maroon-700" : ""}`}
                        >
                          {item.label}
                        </span>
                        {item.accent && (
                          <span className="ml-auto bg-maroon-700 text-white text-xs px-2 py-0.5 rounded">
                            NEW
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Account Section */}
              <nav className="p-4 border-t border-neutral-100">
                <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-2">Account</h3>
                <ul className="space-y-1">
                  {accountItems.map((item) => (
                    <li key={item.href + item.label}>
                      {item.onClick ? (
                        <button
                          onClick={() => {
                            setIsOpen(false)
                            item.onClick!()
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors w-full text-left"
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ) : (
                        <Link
                          href={item.href as any}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors ${
                            pathname === item.href ? "bg-neutral-100" : ""
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Information Section */}
              <nav className="p-4 border-t border-neutral-100">
                <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-2">Information</h3>
                <ul className="space-y-1">
                  {infoItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href as any}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors ${
                          pathname === item.href ? "bg-neutral-100" : ""
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Contact Info */}
              <div className="p-4 border-t border-neutral-100">
                <p className="text-sm text-neutral-600">
                  WhatsApp Support:
                  <a
                    href="https://wa.me/+2348136514087"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1 font-medium text-maroon-700"
                  >
                    +234 813 651 4087
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
