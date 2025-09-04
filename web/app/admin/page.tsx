'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CubeIcon,
  ShoppingCartIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  UserIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-context'

interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalUsers: number
  totalRevenue: number
  productChange: number
  orderChange: number
  userChange: number
  revenueChange: number
  recentOrders: any[]
  lowStockProducts: any[]
}

export default function AdminHome() {
  const { user, hasPermission, isRole } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setError(null)
      // Fetch actual stats from API
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Insufficient permissions.')
        } else {
          throw new Error(`Failed to fetch stats: ${response.status}`)
        }
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data'
      setError(errorMessage)

      // Fallback to safe defaults on error
      setStats({
        totalProducts: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0,
        productChange: 0,
        orderChange: 0,
        userChange: 0,
        revenueChange: 0,
        recentOrders: [],
        lowStockProducts: []
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700"></div>
      </div>
    )
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800">Dashboard Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={fetchDashboardStats}
              className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Get role-specific welcome message and permissions
  const getRoleInfo = () => {
    switch(user?.role) {
      case 'admin':
        return {
          title: 'System Administrator',
          description: 'Full system access - Monitor all operations, manage staff, and configure system settings.',
          color: 'bg-red-50 text-red-800 border-red-200',
          iconColor: 'text-red-600'
        }
      case 'supervisor':
        return {
          title: 'Operations Supervisor',
          description: 'Supervisory access - Oversee daily operations, manage staff performance, and access business reports.',
          color: 'bg-blue-50 text-blue-800 border-blue-200',
          iconColor: 'text-blue-600'
        }
      case 'operations':
        return {
          title: 'Operations Staff',
          description: 'Operations access - Manage inventory, process orders, and handle day-to-day operations.',
          color: 'bg-green-50 text-green-800 border-green-200',
          iconColor: 'text-green-600'
        }
      case 'logistics':
        return {
          title: 'Logistics Coordinator',
          description: 'Logistics access - Coordinate shipments, track deliveries, and manage supplier relationships.',
          color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
          iconColor: 'text-yellow-600'
        }
      default:
        return {
          title: 'Staff Member',
          description: 'Welcome to the admin panel.',
          color: 'bg-gray-50 text-gray-800 border-gray-200',
          iconColor: 'text-gray-600'
        }
    }
  }

  const roleInfo = getRoleInfo()

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      change: stats?.productChange || 0,
      icon: CubeIcon,
      color: 'blue',
      link: '/admin/products'
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      change: stats?.orderChange || 0,
      icon: ShoppingCartIcon,
      color: 'green',
      link: '/admin/orders'
    },
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      change: stats?.userChange || 0,
      icon: UsersIcon,
      color: 'purple',
      link: '/admin/users'
    },
    {
      title: 'Total Revenue',
      value: `₦${(stats?.totalRevenue || 0).toLocaleString()}`,
      change: stats?.revenueChange || 0,
      icon: CurrencyDollarIcon,
      color: 'yellow',
      link: '/admin/analytics'
    }
  ]

  return (
      <div>
      {/* Role-based Welcome Banner */}
      <div className={`p-4 rounded-lg border mb-6 ${roleInfo.color}`}>
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className={`h-6 w-6 ${roleInfo.iconColor} mt-0.5`} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold mb-1">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-sm font-medium mb-2">{roleInfo.title}</p>
            <p className="text-sm opacity-90">{roleInfo.description}</p>
          </div>
          {/* Customer Dashboard View Button */}
          <div className="flex items-center gap-4">
            <Link 
              href="/account" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-current text-sm font-medium rounded-lg hover:bg-white/30 transition-colors border border-current/20"
            >
              <EyeIcon className="h-4 w-4" />
              Customer View
            </Link>
          </div>
        </div>
      </div>

      {/* System Status Notifications */}
      <div className="mb-6 space-y-3">
        {/* Sample notifications - replace with real data */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">System Status</h3>
              <p className="text-sm text-blue-700">All systems operational. Last backup completed 2 hours ago.</p>
            </div>
          </div>
        </div>
        
        {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-900">Inventory Alert</h3>
                <p className="text-sm text-yellow-700">{stats.lowStockProducts.length} products are running low on stock.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const isPositive = stat.change >= 0
          return (
            <Link href={stat.link as any} key={stat.title}>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                  {stat.change !== 0 && (
                    <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? (
                        <ArrowUpIcon className="h-4 w-4" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4" />
                      )}
                      {Math.abs(stat.change)}%
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link href={"/admin/orders" as any} className="text-sm text-maroon-700 hover:text-maroon-800">
              View all →
            </Link>
          </div>
          <div className="p-6">
            {!stats ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-maroon-700"></div>
                <span className="ml-2 text-gray-500">Loading recent orders...</span>
              </div>
            ) : stats.recentOrders.length ? (
              <div className="space-y-4">
                {stats.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            Order #{order.id}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.customer_name || 'Guest'}
                            {order.customer_email && (
                              <span className="text-gray-400 ml-1">({order.customer_email})</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ₦{order.total.toLocaleString()}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'Paid'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'PendingPayment'
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.status === 'Cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent orders</p>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Low Stock Alert</h2>
            <Link href={"/admin/products" as any} className="text-sm text-maroon-700 hover:text-maroon-800">
              Manage inventory →
            </Link>
          </div>
          <div className="p-6">
            {!stats ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-maroon-700"></div>
                <span className="ml-2 text-gray-500">Loading inventory status...</span>
              </div>
            ) : stats.lowStockProducts.length ? (
              <div className="space-y-4">
                {stats.lowStockProducts.map((product: any) => (
                  <div key={`${product.id}-${product.variant_sku}`} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {product.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            SKU: {product.variant_sku}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-red-600 font-medium">
                              Current: {product.current_stock} units
                            </span>
                            <span className="text-xs text-gray-500">
                              Safety Level: {product.safety_stock} units
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              product.current_stock === 0
                                ? 'bg-red-600'
                                : product.current_stock <= product.safety_stock / 2
                                ? 'bg-red-500'
                                : 'bg-yellow-500'
                            }`}></div>
                            <span className="text-xs font-medium text-gray-700">
                              {product.current_stock === 0
                                ? 'Out of Stock'
                                : product.current_stock <= product.safety_stock / 2
                                ? 'Critical'
                                : 'Low Stock'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">All products have sufficient stock</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href={"/admin/products/new" as any} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <CubeIcon className="h-8 w-8 text-maroon-700 mb-2" />
            <span className="text-sm font-medium text-gray-700">Add Product</span>
          </Link>
          <Link href={"/admin/orders" as any} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <ShoppingCartIcon className="h-8 w-8 text-maroon-700 mb-2" />
            <span className="text-sm font-medium text-gray-700">View Orders</span>
          </Link>
          <Link href={"/admin/users" as any} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <UsersIcon className="h-8 w-8 text-maroon-700 mb-2" />
            <span className="text-sm font-medium text-gray-700">Manage Users</span>
          </Link>
          <Link href={"/admin/analytics" as any} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <CurrencyDollarIcon className="h-8 w-8 text-maroon-700 mb-2" />
            <span className="text-sm font-medium text-gray-700">View Analytics</span>
          </Link>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Experience</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/account" className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <UserIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Customer Dashboard</span>
                  <p className="text-xs text-gray-600">View customer account interface</p>
                </div>
              </div>
              <EyeIcon className="h-5 w-5 text-blue-600" />
            </Link>
            
            <Link href="/" className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <div className="flex items-center gap-3">
                <CubeIcon className="h-6 w-6 text-green-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Store Front</span>
                  <p className="text-xs text-gray-600">View public store interface</p>
                </div>
              </div>
              <EyeIcon className="h-5 w-5 text-green-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

