'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useAuth, Permission } from '@/lib/auth-context'
import { PermissionGuard, RoleGuard } from '@/components/auth/permission-guards'
import {
  EyeIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'

interface Order {
  id: number
  status: string
  total: number
  item_count: number
  created_at: string
  user?: {
    name: string
    email: string
  }
  shipping_address?: {
    name: string
    city: string
    state: string
  }
  payment_ref?: string
}

const statusColors: Record<string, string> = {
  'PendingPayment': 'bg-yellow-100 text-yellow-800',
  'Paid': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'Refunded': 'bg-gray-100 text-gray-800',
  'Processing': 'bg-blue-100 text-blue-800',
  'Shipped': 'bg-purple-100 text-purple-800',
  'Delivered': 'bg-green-100 text-green-800'
}

const statusIcons: Record<string, any> = {
  'PendingPayment': ClockIcon,
  'Paid': CheckCircleIcon,
  'Cancelled': XCircleIcon,
  'Refunded': XCircleIcon,
  'Processing': ClockIcon,
  'Shipped': TruckIcon,
  'Delivered': CheckCircleIcon
}

interface Stats {
  totalOrders: number
  totalRevenue: number
  totalUsers: number
  totalProducts: number
  orderChange: number
  revenueChange: number
  userChange: number
  productChange: number
  recentOrders: any[]
  lowStockProducts: any[]
  // Legacy fields for backward compatibility
  total_orders?: number
  total_revenue?: number
  total_customers?: number
  average_order_value?: number
  recent_orders?: number
  recent_revenue?: number
  period_days?: number
}

// Access Denied Component
function AccessDenied() {
  const router = useRouter()
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <ShieldExclamationIcon className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to view this page. Please contact your administrator if you believe this is an error.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/admin')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-maroon-600 hover:bg-maroon-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Order Management Component
function OrderManagementContent() {
  const router = useRouter()
  const { user, hasPermission, isRole } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Check permissions on mount
  useEffect(() => {
    if (!hasPermission(Permission.ORDER_VIEW)) {
      router.push('/admin?error=unauthorized')
    }
  }, [hasPermission, router])

  useEffect(() => {
    fetchOrders()
  }, [currentPage, statusFilter])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const statsData = await api<Stats>('/api/admin/stats')

      // Ensure all numeric fields have default values
      const safeStats: Stats = {
        totalOrders: statsData.totalOrders || statsData.total_orders || 0,
        totalRevenue: statsData.totalRevenue || statsData.total_revenue || 0,
        totalUsers: statsData.totalUsers || statsData.total_customers || 0,
        totalProducts: statsData.totalProducts || 0,
        orderChange: statsData.orderChange || 0,
        revenueChange: statsData.revenueChange || 0,
        userChange: statsData.userChange || 0,
        productChange: statsData.productChange || 0,
        recentOrders: statsData.recentOrders || [],
        lowStockProducts: statsData.lowStockProducts || [],
        // Legacy fields for backward compatibility
        total_orders: statsData.total_orders || statsData.totalOrders || 0,
        total_revenue: statsData.total_revenue || statsData.totalRevenue || 0,
        total_customers: statsData.total_customers || statsData.totalUsers || 0,
        average_order_value: statsData.average_order_value || 0,
        recent_orders: statsData.recent_orders || 0,
        recent_revenue: statsData.recent_revenue || 0,
        period_days: statsData.period_days || 30
      }

      setStats(safeStats)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Set safe fallback values on error
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        totalUsers: 0,
        totalProducts: 0,
        orderChange: 0,
        revenueChange: 0,
        userChange: 0,
        productChange: 0,
        recentOrders: [],
        lowStockProducts: [],
        total_orders: 0,
        total_revenue: 0,
        total_customers: 0,
        average_order_value: 0,
        recent_orders: 0,
        recent_revenue: 0,
        period_days: 30
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '20'
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await api<any>(`/api/admin/orders?${params}`)
      setOrders(response.items || response || [])
      setTotalPages(response.total_pages || 1)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchOrders()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">Track and manage customer orders</p>
          </div>
        </div>
        
        {/* Role-specific notices */}
        {isRole('operations') && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                <strong>Operations Role:</strong> You can view and update order statuses, manage fulfillment, but cannot access customer payment information.
              </p>
            </div>
          </div>
        )}
        
        {isRole('logistics') && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <TruckIcon className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800">
                <strong>Logistics Role:</strong> Focus on order fulfillment, shipping, and delivery tracking.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {(stats.totalOrders || stats.total_orders || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {stats.orderChange !== undefined ? (
                <span className={stats.orderChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.orderChange >= 0 ? '+' : ''}{stats.orderChange.toFixed(1)}% from last period
                </span>
              ) : (
                `${(stats.recent_orders || 0).toLocaleString()} in last ${stats.period_days || 30} days`
              )}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ₦{(stats.totalRevenue || stats.total_revenue || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {stats.revenueChange !== undefined ? (
                <span className={stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange.toFixed(1)}% from last period
                </span>
              ) : (
                `₦${(stats.recent_revenue || 0).toLocaleString()} in last ${stats.period_days || 30} days`
              )}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Users</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {(stats.totalUsers || stats.total_customers || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {stats.userChange !== undefined ? (
                <span className={stats.userChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.userChange >= 0 ? '+' : ''}{stats.userChange.toFixed(1)}% from last period
                </span>
              ) : (
                'Registered users'
              )}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Products</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {(stats.totalProducts || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {stats.productChange !== undefined ? (
                <span className={stats.productChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.productChange >= 0 ? '+' : ''}{stats.productChange.toFixed(1)}% from last period
                </span>
              ) : (
                'Active products'
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <p className="text-yellow-800 text-sm">Unable to load statistics. Please refresh the page.</p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by order ID, customer name, or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
            >
              <option value="all">All Status</option>
              <option value="PendingPayment">Pending Payment</option>
              <option value="Paid">Paid</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const StatusIcon = statusIcons[order.status] || ClockIcon
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{order.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.user?.name || order.shipping_address?.name || 'Guest'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.user?.email || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.item_count || 0} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₦{(order.total || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                            {order.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/orders/${order.id}`} className="text-maroon-600 hover:text-maroon-900">
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export main component with RBAC guards
export default function OrdersManagementPage() {
  return (
    <RoleGuard roles={['admin', 'supervisor', 'operations', 'logistics']}>
      <PermissionGuard 
        permission={Permission.ORDER_VIEW}
        fallback={<AccessDenied />}
      >
        <OrderManagementContent />
      </PermissionGuard>
    </RoleGuard>
  )
}
