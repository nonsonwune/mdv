"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, Permission } from "@/lib/auth-context"
import {
  HomeIcon,
  ShoppingBagIcon,
  UsersIcon,
  ChartBarIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingStorefrontIcon,
  TagIcon,
  TruckIcon,
  DocumentTextIcon,
  BellIcon,
} from "@heroicons/react/24/outline"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: HomeIcon,
  },
  {
    name: "Products",
    href: "/admin/products",
    icon: CubeIcon,
    permission: Permission.PRODUCT_VIEW,
  },
  {
    name: "Orders",
    href: "/admin/orders",
    icon: ShoppingBagIcon,
    permission: Permission.ORDER_VIEW,
  },
  {
    name: "Inventory",
    href: "/admin/inventory",
    icon: ClipboardDocumentListIcon,
    permission: Permission.VIEW_INVENTORY,
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: UsersIcon,
    permission: Permission.VIEW_USERS,
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: ChartBarIcon,
    permission: Permission.ANALYTICS_VIEW,
  },
  {
    name: "Categories",
    href: "/admin/categories",
    icon: TagIcon,
    permission: Permission.VIEW_CATEGORIES,
  },
]

export default function AdminNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, hasPermission, logout } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const handleLogout = async () => {
    await logout()
    router.push("/staff-login")
  }

  const toggleExpand = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/")
  }

  const canViewItem = (item: NavItem) => {
    if (!item.permission) return true
    return hasPermission(item.permission)
  }

  const renderNavItem = (item: NavItem) => {
    if (!canViewItem(item)) return null

    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.name)
    const Icon = item.icon

    return (
      <li key={item.href}>
        {hasChildren ? (
          <div>
            <button
              onClick={() => toggleExpand(item.name)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-maroon-50 text-maroon-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {item.name}
              </div>
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
            {isExpanded && (
              <ul className="ml-7 mt-1 space-y-1">
                {item.children.map(child => renderNavItem(child))}
              </ul>
            )}
          </div>
        ) : (
          <Link
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive(item.href)
                ? "bg-maroon-50 text-maroon-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Icon className="h-5 w-5" />
            {item.name}
          </Link>
        )}
      </li>
    )
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-2">
            <BuildingStorefrontIcon className="h-8 w-8 text-maroon-700" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">MDV Admin</h1>
              <p className="text-xs text-gray-500">{user?.role || "Staff"} Portal</p>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-maroon-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-maroon-700">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <BellIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map(item => renderNavItem(item))}
          </ul>

          {/* Additional Links */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin/reports"
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive("/admin/reports")
                      ? "bg-maroon-50 text-maroon-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  Reports
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive("/admin/settings")
                      ? "bg-maroon-50 text-maroon-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <BuildingStorefrontIcon className="h-5 w-5" />
            View Store
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
