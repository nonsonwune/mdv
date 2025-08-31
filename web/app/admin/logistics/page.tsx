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
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface ShipmentSummary {
  total_shipments: number
  dispatched: number
  in_transit: number
  delivered: number
  returned: number
  pending_dispatch: number
}

interface ReadyToShipOrder {
  id: number
  order_number: string
  customer_name: string
  items_count: number
  total_amount: number
  created_at: string
  shipping_address: {
    city: string
    state: string
  }
}

export default function LogisticsDashboard() {
  const { user, hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [shipmentStats, setShipmentStats] = useState<ShipmentSummary | null>(null)
  const [readyToShipOrders, setReadyToShipOrders] = useState<ReadyToShipOrder[]>([])
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

  const fetchLogisticsData = async () => {
    try {
      setError(null)
      setLoading(true)

      // Fetch shipment statistics
      const statsResponse = await api('/api/admin/logistics/stats')
      setShipmentStats(statsResponse)

      // Fetch orders ready to ship
      const ordersResponse = await api('/api/admin/logistics/ready-to-ship')
      setReadyToShipOrders(ordersResponse.orders || [])

    } catch (error) {
      console.error('Failed to fetch logistics data:', error)
      setError('Failed to load logistics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogisticsData()
  }, [])

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logistics Dashboard</h1>
        <p className="text-gray-600">Manage shipments and deliveries</p>
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

      {/* Ready to Ship Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Orders Ready to Ship</h3>
          <p className="text-sm text-gray-600">Orders that have been fulfilled and are ready for dispatch</p>
        </div>
        
        {readyToShipOrders.length === 0 ? (
          <div className="p-6 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders ready to ship</h3>
            <p className="text-gray-500">All orders have been processed or are still being fulfilled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {readyToShipOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {order.shipping_address.city}, {order.shipping_address.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleCreateShipment(order.id)}
                        className="text-maroon-600 hover:text-maroon-900"
                      >
                        Create Shipment
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
    </div>
  )
}
