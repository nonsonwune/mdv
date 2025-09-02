'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api-client'
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface ShipmentSummary {
  total_shipments: number
  dispatched: number
  in_transit: number
  delivered: number
  returned: number
  pending_dispatch: number
  ready_to_ship: number
  all_orders: number
  in_transit_total: number
  tabs: {
    all_orders: number
    ready_to_ship: number
    in_transit: number
    delivered: number
    pending_dispatch: number
  }
}

interface LogisticsOrder {
  id: number
  order_number: string
  customer_name: string
  items_count: number
  total_amount: number
  created_at: string
  shipping_address: {
    city: string
    state: string
    street?: string
  }
  // Additional fields for different order types
  logistics_status?: string
  fulfillment_status?: string
  shipment_status?: string
  tracking_id?: string
  courier?: string
  dispatched_at?: string
  delivered_at?: string
  packed_at?: string
  pending_hours?: number
  fulfillment_notes?: string
}

type TabKey = 'all-orders' | 'ready-to-ship' | 'in-transit' | 'delivered' | 'pending-dispatch'

export default function LogisticsDashboard() {
  const { user, hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [shipmentStats, setShipmentStats] = useState<ShipmentSummary | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('all-orders')
  const [tabLoading, setTabLoading] = useState<Record<TabKey, boolean>>({
    'all-orders': false,
    'ready-to-ship': false,
    'in-transit': false,
    'delivered': false,
    'pending-dispatch': false
  })
  const [tabData, setTabData] = useState<Record<TabKey, LogisticsOrder[]>>({
    'all-orders': [],
    'ready-to-ship': [],
    'in-transit': [],
    'delivered': [],
    'pending-dispatch': []
  })
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<{type: string, data?: any} | null>(null)
  const [bulkActionResult, setBulkActionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if user has logistics access
  if (!user || !['admin', 'supervisor', 'logistics'].includes(user.role)) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-500">You don't have permission to access the logistics dashboard.</p>
      </div>
    )
  }

  const fetchLogisticsStats = async () => {
    try {
      setError(null)
      const statsResponse = await api('/api/admin/logistics/stats')
      setShipmentStats(statsResponse)
    } catch (error) {
      console.error('Failed to fetch logistics stats:', error)
      setError('Failed to load logistics statistics. Please try again.')
    }
  }

  const fetchTabData = async (tab: TabKey) => {
    try {
      setTabLoading(prev => ({ ...prev, [tab]: true }))
      setError(null)

      let endpoint = ''
      switch (tab) {
        case 'all-orders':
          endpoint = '/api/admin/logistics/all-orders'
          break
        case 'ready-to-ship':
          endpoint = '/api/admin/logistics/ready-to-ship'
          break
        case 'in-transit':
          endpoint = '/api/admin/logistics/in-transit'
          break
        case 'delivered':
          endpoint = '/api/admin/logistics/delivered'
          break
        case 'pending-dispatch':
          endpoint = '/api/admin/logistics/pending-dispatch'
          break
      }

      const response = await api(endpoint)
      setTabData(prev => ({ ...prev, [tab]: response.orders || [] }))

    } catch (error) {
      console.error(`Failed to fetch ${tab} data:`, error)
      setError(`Failed to load ${tab.replace('-', ' ')} data. Please try again.`)
    } finally {
      setTabLoading(prev => ({ ...prev, [tab]: false }))
    }
  }

  const fetchLogisticsData = async () => {
    try {
      setLoading(true)
      await fetchLogisticsStats()
      await fetchTabData(activeTab)
    } catch (error) {
      console.error('Failed to fetch logistics data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Bulk action handlers
  const handleSelectOrder = (orderId: number, checked: boolean) => {
    const newSelected = new Set(selectedOrders)
    if (checked) {
      newSelected.add(orderId)
    } else {
      newSelected.delete(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allOrderIds = new Set(tabData[activeTab].map(order => order.id))
      setSelectedOrders(allOrderIds)
    } else {
      setSelectedOrders(new Set())
    }
  }

  const handleBulkCreateShipments = () => {
    if (selectedOrders.size === 0) return
    setBulkAction({ type: 'create-shipments' })
    setShowBulkConfirmDialog(true)
  }

  const handleBulkUpdateStatus = (status: string) => {
    if (selectedOrders.size === 0) return
    setBulkAction({ type: 'update-status', data: { status } })
    setShowBulkConfirmDialog(true)
  }

  const executeBulkAction = async () => {
    if (!bulkAction || selectedOrders.size === 0) return

    setBulkActionLoading(true)
    setShowBulkConfirmDialog(false)

    try {
      const orderIds = Array.from(selectedOrders)
      let response

      if (bulkAction.type === 'create-shipments') {
        response = await api('/api/admin/logistics/bulk-create-shipments', {
          method: 'POST',
          body: JSON.stringify({
            order_ids: orderIds,
            courier: 'DHL'
          })
        })
      } else if (bulkAction.type === 'update-status') {
        response = await api('/api/admin/logistics/bulk-update-status', {
          method: 'POST',
          body: JSON.stringify({
            order_ids: orderIds,
            status: bulkAction.data.status,
            notes: `Bulk status update via logistics dashboard`
          })
        })
      }

      setBulkActionResult(response)
      setSelectedOrders(new Set())

      // Refresh current tab data
      await fetchTabData(activeTab)
      await fetchLogisticsStats()

    } catch (error) {
      console.error('Bulk action failed:', error)
      setError('Bulk action failed. Please try again.')
    } finally {
      setBulkActionLoading(false)
      setBulkAction(null)
    }
  }

  // Handle tab changes
  const handleTabChange = async (tab: TabKey) => {
    setActiveTab(tab)
    if (tabData[tab].length === 0) {
      await fetchTabData(tab)
    }
  }

  useEffect(() => {
    fetchLogisticsData()
  }, [])

  // Auto-refresh current tab every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogisticsStats()
      fetchTabData(activeTab)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [activeTab])

  const handleCreateShipment = async (orderId: number) => {
    try {
      // This would open a modal or navigate to shipment creation
      console.log('Create shipment for order:', orderId)
      // TODO: Implement shipment creation workflow
    } catch (error) {
      console.error('Failed to create shipment:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={fetchLogisticsData}
              className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics Dashboard</h1>
          <p className="text-gray-600">Manage shipments and deliveries</p>
        </div>
        <button
          onClick={fetchLogisticsData}
          disabled={loading}
          className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Shipment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Shipments</p>
              <p className="text-2xl font-bold text-gray-900">
                {shipmentStats?.total_shipments || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Transit</p>
              <p className="text-2xl font-bold text-gray-900">
                {shipmentStats?.in_transit || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-gray-900">
                {shipmentStats?.delivered || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Dispatch</p>
              <p className="text-2xl font-bold text-gray-900">
                {shipmentStats?.pending_dispatch || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logistics Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              {
                key: 'all-orders',
                label: 'All Orders',
                icon: ChartBarIcon,
                count: shipmentStats?.tabs?.all_orders || 0
              },
              {
                key: 'ready-to-ship',
                label: 'Ready to Ship',
                icon: TruckIcon,
                count: shipmentStats?.tabs?.ready_to_ship || 0
              },
              {
                key: 'in-transit',
                label: 'In Transit',
                icon: ArrowPathIcon,
                count: shipmentStats?.tabs?.in_transit || 0
              },
              {
                key: 'delivered',
                label: 'Delivered',
                icon: CheckCircleIcon,
                count: shipmentStats?.tabs?.delivered || 0
              },
              {
                key: 'pending-dispatch',
                label: 'Pending Dispatch',
                icon: ExclamationTriangleIcon,
                count: shipmentStats?.tabs?.pending_dispatch || 0
              }
            ].map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              const isLoading = tabLoading[tab.key as TabKey]

              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key as TabKey)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-maroon-500 text-maroon-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    isActive
                      ? 'bg-maroon-100 text-maroon-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-maroon-600 ml-1"></div>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {activeTab === 'all-orders' && 'All Orders in Logistics Pipeline'}
                {activeTab === 'ready-to-ship' && 'Orders Ready to Ship'}
                {activeTab === 'in-transit' && 'Orders In Transit'}
                {activeTab === 'delivered' && 'Delivered Orders'}
                {activeTab === 'pending-dispatch' && 'Orders Pending Dispatch'}
              </h3>
              <p className="text-sm text-gray-600">
                {activeTab === 'all-orders' && 'Overview of all orders in the logistics workflow'}
                {activeTab === 'ready-to-ship' && 'Orders that have been fulfilled and are ready for dispatch'}
                {activeTab === 'in-transit' && 'Orders currently being shipped to customers'}
                {activeTab === 'delivered' && 'Orders that have been successfully delivered'}
                {activeTab === 'pending-dispatch' && 'Orders ready to ship but awaiting shipment creation'}
              </p>
            </div>
            <button
              onClick={() => fetchTabData(activeTab)}
              disabled={tabLoading[activeTab]}
              className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowPathIcon className={`h-4 w-4 ${tabLoading[activeTab] ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.size > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedOrders(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear selection
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'ready-to-ship' && (
                  <button
                    onClick={handleBulkCreateShipments}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <TruckIcon className="h-4 w-4" />
                    Create Shipments ({selectedOrders.size})
                  </button>
                )}

                {(activeTab === 'in-transit' || activeTab === 'delivered') && (
                  <>
                    <button
                      onClick={() => handleBulkUpdateStatus('delivered')}
                      disabled={bulkActionLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Mark as Delivered ({selectedOrders.size})
                    </button>
                    <button
                      onClick={() => handleBulkUpdateStatus('returned')}
                      disabled={bulkActionLoading}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Mark as Returned ({selectedOrders.size})
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {tabLoading[activeTab] ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading {activeTab.replace('-', ' ')} data...</p>
          </div>
        ) : tabData[activeTab].length === 0 ? (
          <div className="p-6 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab.replace('-', ' ')} found
            </h3>
            <p className="text-gray-500">
              {activeTab === 'all-orders' && 'No orders are currently in the logistics pipeline.'}
              {activeTab === 'ready-to-ship' && 'All orders have been processed or are still being fulfilled.'}
              {activeTab === 'in-transit' && 'No orders are currently being shipped.'}
              {activeTab === 'delivered' && 'No orders have been delivered recently.'}
              {activeTab === 'pending-dispatch' && 'All orders have been dispatched or are not ready yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size > 0 && selectedOrders.size === tabData[activeTab].length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  {activeTab === 'all-orders' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  {(activeTab === 'in-transit' || activeTab === 'delivered') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking
                    </th>
                  )}
                  {activeTab === 'pending-dispatch' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending Time
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tabData[activeTab].map((order) => (
                  <tr key={order.id} className={`hover:bg-gray-50 ${selectedOrders.has(order.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{order.order_number}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.items_count} items</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₦{order.total_amount.toLocaleString()}</div>
                    </td>
                    {activeTab === 'all-orders' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.logistics_status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.logistics_status === 'dispatched' || order.logistics_status === 'intransit' ? 'bg-blue-100 text-blue-800' :
                          order.logistics_status === 'ready_to_ship' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.logistics_status?.replace('_', ' ') || 'Processing'}
                        </span>
                      </td>
                    )}
                    {(activeTab === 'in-transit' || activeTab === 'delivered') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.tracking_id}</div>
                        <div className="text-sm text-gray-500">{order.courier}</div>
                      </td>
                    )}
                    {activeTab === 'pending-dispatch' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.pending_hours ? `${order.pending_hours}h` : 'N/A'}
                        </div>
                        {order.pending_hours && order.pending_hours > 24 && (
                          <div className="text-xs text-red-600">Overdue</div>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {order.shipping_address.city}, {order.shipping_address.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {activeTab === 'ready-to-ship' && (
                        <button
                          onClick={() => handleCreateShipment(order.id)}
                          className="text-maroon-600 hover:text-maroon-900 mr-4"
                        >
                          Create Shipment
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                        <EyeIcon className="h-4 w-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role-specific notice */}
      {user?.role === 'logistics' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <TruckIcon className="h-5 w-5 text-blue-600 mr-3" />
            <p className="text-sm text-blue-700">
              <strong>Logistics Dashboard:</strong> You have access to shipment management and delivery tracking functions.
            </p>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Dialog */}
      {showBulkConfirmDialog && bulkAction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm Bulk Action
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {bulkAction.type === 'create-shipments'
                  ? `Create shipments for ${selectedOrders.size} selected orders?`
                  : `Update status to "${bulkAction.data?.status}" for ${selectedOrders.size} selected orders?`
                }
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowBulkConfirmDialog(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkAction}
                  className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Loading Overlay */}
      {bulkActionLoading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processing Bulk Action
              </h3>
              <p className="text-sm text-gray-500">
                Please wait while we process {selectedOrders.size} orders...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Result Dialog */}
      {bulkActionResult && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
                Bulk Action Results
              </h3>

              <div className="space-y-4">
                <div className="text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Total Processed:</span>
                    <span>{bulkActionResult.results?.total_processed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 text-green-600">
                    <span className="font-medium">Successful:</span>
                    <span>{bulkActionResult.results?.success?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4 text-red-600">
                    <span className="font-medium">Failed:</span>
                    <span>{bulkActionResult.results?.failed?.length || 0}</span>
                  </div>
                </div>

                {bulkActionResult.results?.failed?.length > 0 && (
                  <div className="max-h-32 overflow-y-auto">
                    <h4 className="text-sm font-medium text-red-600 mb-2">Failed Orders:</h4>
                    {bulkActionResult.results.failed.map((failure: any, index: number) => (
                      <div key={index} className="text-xs text-red-500 mb-1">
                        Order {failure.order_id}: {failure.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setBulkActionResult(null)}
                  className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
