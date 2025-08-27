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
  PencilIcon,
  DocumentTextIcon,
  PrinterIcon,
  ArrowPathIcon,
  CubeIcon,
  UserIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  Cog6ToothIcon,
  TagIcon
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
  total_orders: number
  total_revenue: number
  total_customers: number
  average_order_value: number
  recent_orders: number
  recent_revenue: number
  period_days: number
}

// Enhanced Order Management Component with RBAC
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
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'processing' | 'shipped'>('all')
  const [showBulkActions, setShowBulkActions] = useState(false)

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
      setStats(statsData)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
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

      // Using the admin orders endpoint
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

  // Note: Order status transitions are handled via specific endpoints (cancel, fulfill, shipment).
  // The generic status update function has been removed to avoid calling non-existent APIs.

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

// Export main component with RBAC guards
export default function OrdersManagementPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'supervisor', 'operations', 'logistics']}>
      <PermissionGuard 
        permission={Permission.ORDER_VIEW}
        fallback={<AccessDenied />}
      >
        <OrderManagementContent />
      </PermissionGuard>
    </RoleGuard>
  )
}
  // Function to handle order status changes
  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    if (!hasPermission(Permission.ORDER_EDIT)) {
      alert('You do not have permission to update order status')
      return
    }

    try {
      await api(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      })
      
      fetchOrders() // Refresh orders
      fetchStats() // Refresh stats
    } catch (error) {
      console.error('Failed to update order status:', error)
      alert('Failed to update order status')
    }
  }

  // Function to handle bulk status updates
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedOrders.length === 0) {
      alert('Please select orders to update')
      return
    }

    if (!hasPermission(Permission.ORDER_EDIT)) {
      alert('You do not have permission to update order status')
      return
    }

    try {
      await api('/api/admin/orders/bulk-update', {
        method: 'PATCH',
        body: JSON.stringify({
          order_ids: selectedOrders,
          status
        })
      })

      setSelectedOrders([])
      fetchOrders()
      fetchStats()
    } catch (error) {
      console.error('Failed to bulk update orders:', error)
      alert('Failed to update orders')
    }
  }

  // Function to export orders to CSV
  const handleExportOrders = async () => {
    if (!hasPermission(Permission.ORDER_EXPORT)) {
      alert('You do not have permission to export orders')
      return
    }

    try {
      const params = new URLSearchParams()
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await api<any>(`/api/admin/orders/export?${params}`, {
        method: 'GET',
        responseType: 'blob'
      })

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `orders-export-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()

      // Clean up
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export orders:', error)
      alert('Failed to export orders')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">
              Track and manage customer orders
              {isRole('logistics') && (
                <span className="text-blue-600 ml-2">(Fulfillment Focus)</span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Quick Actions based on permissions */}
            <PermissionGuard permission={Permission.ORDER_EXPORT}>
              <button
                onClick={handleExportOrders}
                className="flex items-center gap-2 px-4 py-2 border border-maroon-300 text-maroon-700 rounded-lg hover:bg-maroon-50 transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Export Orders
              </button>
            </PermissionGuard>
            
            <PermissionGuard permission={Permission.ORDER_EDIT}>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
              >
                <Cog6ToothIcon className="h-5 w-5" />
                Bulk Actions
              </button>
            </PermissionGuard>
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
                <strong>Logistics Role:</strong> Focus on order fulfillment, shipping, and delivery tracking. You can update shipping status and tracking information.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total_orders.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-500">
              {stats.recent_orders.toLocaleString()} in last {stats.period_days} days
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">₦{stats.total_revenue.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-500">
              ₦{stats.recent_revenue.toLocaleString()} in last {stats.period_days} days
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Customers</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total_customers.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-500">Unique customers</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Average Order Value</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">₦{stats.average_order_value.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-500">Per order</p>
          </div>
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

        {/* Bulk Actions Bar */}
        {selectedOrders.length > 0 && hasPermission(Permission.ORDER_EDIT) && (
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                {isRole('operations') || isRole('supervisor') || isRole('admin') ? (
                  <>
                    <button
                      onClick={() => handleBulkStatusUpdate('Processing')}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Mark Processing
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('Shipped')}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark Shipped
                    </button>
                  </>
                ) : null}
                
                {isRole('logistics') && (
                  <button
                    onClick={() => handleBulkStatusUpdate('Shipped')}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Mark Shipped
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedOrders([])}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {hasPermission(Permission.ORDER_EDIT) && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders(orders.map(o => o.id))
                        } else {
                          setSelectedOrders([])
                        }
                      }}
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                    />
                  </th>
                )}
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

