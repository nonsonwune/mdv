"use client"

import { ReactNode, useState } from "react"
import AdminNavigation from "./AdminNavigation"
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline"

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <AdminNavigation />
        <main className="flex-1">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-lg font-semibold text-gray-900">MDV Admin</h1>
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileNavOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
              <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Overlay */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setIsMobileNavOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <AdminNavigation />
            </div>
          </div>
        )}

        {/* Mobile Main Content */}
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
