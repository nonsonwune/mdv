'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useAuth, Permission } from '@/lib/auth-context'
import { PermissionGuard } from '@/components/auth/permission-guards'

interface User {
  id: number
  name: string
  email: string
  role: string
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, loading, isStaff, logout, hasPermission, isRole } = useAuth()

  useEffect(() => {
    // Wait for auth to fully load before making decisions
    if (loading) return

    if (!user) {
      // No user authenticated, redirect to login
      console.log('[Admin Layout] No user found, redirecting to login')
      router.replace('/staff-login')
      return
    }

    if (!isStaff) {
      // User is authenticated but not staff, show permission error
      console.log('[Admin Layout] User not staff, redirecting with error. User:', user.email, 'Role:', user.role, 'isStaff:', isStaff)
      router.replace('/staff-login?error=insufficient_permissions')
      return
    }

    console.log('[Admin Layout] Auth check passed for user:', user.email, 'Role:', user.role)
  }, [loading, user, isStaff, router])

  const handleLogout = async () => {
    await logout()
  }

  // Define navigation sections with role-based organization
  const navigationSections = [
    {
      name: 'Overview',
      items: [
        { 
          name: 'Dashboard', 
          href: '/admin', 
          icon: HomeIcon,
          permission: null,
          description: 'System overview and quick actions'
        }
      ]
    },
    {
      name: 'Catalog Management',
      items: [
        { 
          name: 'Products', 
          href: '/admin/products', 
          icon: CubeIcon,
          permission: Permission.PRODUCT_VIEW,
          roles: ['admin', 'supervisor', 'operations'],
          description: 'Product catalog and inventory'
        },
        { 
          name: 'Categories', 
          href: '/admin/categories', 
          icon: TagIcon,
          permission: Permission.PRODUCT_CREATE,
          roles: ['admin', 'supervisor'],
          description: 'Product organization'
        }
      ]
    },
    {
      name: 'Operations',
      items: [
        { 
          name: 'Orders', 
          href: '/admin/orders', 
          icon: ShoppingCartIcon,
          permission: Permission.ORDER_VIEW,
          description: 'Order processing and fulfillment'
        },
        {
          name: 'Inventory',
          href: '/admin/inventory',
          icon: ArchiveBoxIcon,
          permission: Permission.INVENTORY_VIEW,
          roles: ['admin', 'supervisor', 'operations'],
          description: 'Stock management and adjustments'
        },
        {
          name: 'Logistics',
          href: '/admin/logistics',
          icon: TruckIcon,
          permission: Permission.ORDER_VIEW,
          roles: ['admin', 'supervisor', 'logistics'],
          description: 'Shipping and delivery management'
        }
      ]
    },
    {
      name: 'Analytics & Reports',
      items: [
        { 
          name: 'Reports', 
          href: '/admin/reports', 
          icon: DocumentChartBarIcon,
          permission: Permission.REPORT_VIEW,
          roles: ['admin', 'supervisor'],
          description: 'Business intelligence and reports'
        },
        { 
          name: 'Analytics', 
          href: '/admin/analytics', 
          icon: ChartBarIcon,
          permission: Permission.ANALYTICS_VIEW,
          roles: ['admin', 'supervisor'],
          description: 'Performance metrics and insights'
        }
      ]
    },
    {
      name: 'Administration',
      items: [
        {
          name: 'Users',
          href: '/admin/users',
          icon: UserGroupIcon,
          permission: Permission.USER_VIEW,
          roles: ['admin', 'supervisor'],
          description: 'Staff account management'
        },
        {
          name: 'Audit Logs',
          href: '/admin/audit',
          icon: DocumentTextIcon,
          permission: null, // Handled by AdminRouteGuard component
          roles: ['admin'],
          description: 'System activity monitoring and compliance'
        },
        {
          name: 'Settings',
          href: '/admin/settings',
          icon: Cog6ToothIcon,
          permission: Permission.SYSTEM_SETTINGS,
          roles: ['admin'],
          description: 'System configuration'
        }
      ]
    }
  ]

  // Flatten and filter navigation based on permissions and roles
  const allNavItems = navigationSections.flatMap(section => 
    section.items.map(item => ({ ...item, section: section.name }))
  )
  
  const filteredNavigation = allNavItems.filter(item => {
    // If no permission required, show to all staff
    if (!item.permission) return true
    
    // Check if user has the required permission
    if (!hasPermission(item.permission)) return false
    
    // If specific roles are defined, check role
    // Note: roles property is optional and not used in current implementation
    
    return true
  })

  // Group filtered navigation back into sections
  const filteredSections = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      filteredNavigation.some(navItem => navItem.name === item.name)
    )
  })).filter(section => section.items.length > 0)

  // Get role-specific welcome message
  const getRoleWelcomeMessage = () => {
    switch(user?.role) {
      case 'admin':
        return 'Full system administrator access'
      case 'supervisor':
        return 'Supervisory access to operations and staff'
      case 'operations':
        return 'Operations and inventory management'
      case 'logistics':
        return 'Order fulfillment and shipping'
      default:
        return 'Staff member'
    }
  }

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Show loading spinner while auth context is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show verification screen if user is not authenticated or not staff
  // The useEffect will handle redirects
  if (!user || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
          {/* Debugging for operations user issue */}
          <div className="mt-4 p-4 bg-yellow-100 rounded-lg text-left text-sm">
            <p><b>Debug Info:</b></p>
            <p>User: {user ? `${user.email} (${user.role})` : 'null'}</p>
            <p>Loading: {String(loading)}</p>
            <p>isStaff: {String(isStaff)}</p>
            <p>isAuthenticated(derived): {String(!!user)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-80 md:w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out safe-area-inset
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link href="/admin" className="text-xl font-bold text-maroon-700">
              MDV Admin
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            {filteredSections.map((section, sectionIndex) => (
              <div key={section.name} className={sectionIndex > 0 ? 'mt-6' : ''}>
                {/* Section Header */}
                <div className="px-3 py-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.name}
                  </h3>
                </div>
                
                {/* Section Items */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href as any}
                        className={`
                          flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-base md:text-sm font-medium transition-colors group min-h-[44px]
                          ${isActive
                            ? 'bg-maroon-50 text-maroon-700 border border-maroon-200'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                        title={item.description}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? 'text-maroon-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                        <span className="flex-1">{item.name}</span>
                        {isActive && (
                          <div className="w-2 h-2 bg-maroon-600 rounded-full"></div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-1 text-xs bg-maroon-100 text-maroon-700 rounded">
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:hidden safe-area-inset">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <span className="text-lg font-semibold text-gray-900">MDV Admin</span>
          </div>

          {/* Mobile user info */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <div className="w-8 h-8 bg-maroon-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-maroon-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
