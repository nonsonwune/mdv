'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useAuth, Permission } from '@/lib/auth-context'
import { PermissionGuard, RoleGuard } from '@/components/auth/permission-guards'
import {
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ClockIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline'

interface LowStockItem {
  variant_id: number
  product_id: number
  product_title: string
  sku: string
  size?: string
  color?: string
  current_quantity: number
  safety_stock: number
  shortage: number
}

interface InventoryItem {
  id: number
  variant_id: number
  product_title: string
  sku: string
  size?: string
  color?: string
  price: number
  quantity: number
  safety_stock: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

interface StockAdjustment {
  variant_id: number
  delta: number
  reason: string
}

// Main inventory page component with full RBAC integration
function InventoryManagementContent() {
  const { user, hasPermission } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'low-stock' | 'adjust'>('overview')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Stock adjustment state
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [adjustmentReason, setAdjustmentReason] = useState('Manual adjustment')
  const [processing, setProcessing] = useState(false)
  
  // Permission-based access checks
  const canViewInventory = hasPermission(Permission.VIEW_INVENTORY)
  const canAdjustStock = hasPermission(Permission.MANAGE_INVENTORY)
  const canViewReports = hasPermission(Permission.VIEW_REPORTS)
  const canExportData = hasPermission(Permission.EXPORT_DATA)

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchInventory()
    } else if (activeTab === 'low-stock') {
      fetchLowStockItems()
    }
  }, [activeTab, searchTerm, statusFilter])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      // Note: This endpoint would need to be created in the backend
      const response = await api<any>(`/api/admin/inventory?${params}`)
      setInventory(response.items || [])
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error?.message?.includes('Not authenticated') || error?.message?.includes('401')) {
        // Redirect to staff login for authentication
        window.location.href = '/staff-login?error=authentication_required'
        return
      }
      
      // Only log non-auth errors
      if (!error?.message?.includes('401') && !error?.message?.includes('Not authenticated')) {
        console.error('Failed to fetch inventory:', error)
      }
      
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  const fetchLowStockItems = async () => {
    try {
      setLoading(true)
      const response = await api<LowStockItem[]>('/api/admin/inventory/low-stock')
      setLowStockItems(response)
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error?.message?.includes('Not authenticated') || error?.message?.includes('401')) {
        // Redirect to staff login for authentication
        window.location.href = '/staff-login?error=authentication_required'
        return
      }
      
      // Only log non-auth errors
      if (!error?.message?.includes('401') && !error?.message?.includes('Not authenticated')) {
        console.error('Failed to fetch low stock items:', error)
      }
      
      setLowStockItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAdjust = (variantId: number, delta: number) => {
    const existingIndex = adjustments.findIndex(adj => adj.variant_id === variantId)
    
    if (existingIndex >= 0) {
      const newAdjustments = [...adjustments]
      newAdjustments[existingIndex].delta += delta
      
      // Remove if delta becomes 0
      if (newAdjustments[existingIndex].delta === 0) {
        newAdjustments.splice(existingIndex, 1)
      }
      
      setAdjustments(newAdjustments)
    } else if (delta !== 0) {
      setAdjustments(prev => [...prev, {
        variant_id: variantId,
        delta,
        reason: adjustmentReason
      }])
    }
  }

  const handleBulkAdjustment = async () => {
    if (adjustments.length === 0) return

    setProcessing(true)
    try {
      await api('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          adjustments: adjustments.map(adj => ({
            variant_id: adj.variant_id,
            delta: adj.delta,
            safety_stock: null
          })),
          reason: adjustmentReason,
          reference_type: 'manual_adjustment',
          reference_id: null
        })
      })

      // Clear adjustments and refresh data
      setAdjustments([])
      if (activeTab === 'overview') {
        fetchInventory()
      } else if (activeTab === 'low-stock') {
        fetchLowStockItems()
      }
      
      alert('Inventory adjustments applied successfully!')
    } catch (error) {
      console.error('Failed to apply adjustments:', error)
      alert('Failed to apply inventory adjustments')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800'
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800'
      case 'out_of_stock':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'In Stock'
      case 'low_stock':
        return 'Low Stock'
      case 'out_of_stock':
        return 'Out of Stock'
      default:
        return 'Unknown'
    }
  }

  const getPendingAdjustment = (variantId: number): number => {
    const adjustment = adjustments.find(adj => adj.variant_id === variantId)
    return adjustment?.delta || 0
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600">Monitor and adjust stock levels</p>
        
        {/* Role-based access notice */}
        {!canAdjustStock && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ShieldExclamationIcon className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700">
                <strong>Limited Access:</strong> You have read-only access to inventory. Stock adjustments require admin or supervisor permissions.
              </p>
            </div>
          </div>
        )}
        
        {user?.role === 'logistics' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-700">
                <strong>Logistics View:</strong> You can view inventory levels and low stock alerts to support operations planning.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {inventory.filter(item => item.status === 'out_of_stock').length}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Adjustments</p>
              <p className="text-2xl font-bold text-purple-600">{adjustments.length}</p>
            </div>
            <AdjustmentsHorizontalIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: ChartBarIcon },
              { key: 'low-stock', label: 'Low Stock Alerts', icon: ExclamationTriangleIcon },
              { key: 'adjust', label: 'Bulk Adjustments', icon: AdjustmentsHorizontalIcon }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-maroon-500 text-maroon-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow">
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by product name or SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              >
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
              <button
                onClick={fetchInventory}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Safety Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quick Adjust
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <ArrowPathIcon className="h-6 w-6 animate-spin mr-2" />
                        Loading inventory...
                      </div>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No inventory items found
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const pendingAdjustment = getPendingAdjustment(item.variant_id)
                    const newQuantity = item.quantity + pendingAdjustment
                    
                    return (
                      <tr key={item.variant_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.product_title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.sku}
                              {(item.size || item.color) && (
                                <span className="ml-2">
                                  {[item.size, item.color].filter(Boolean).join(' / ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.quantity}
                            {pendingAdjustment !== 0 && (
                              <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                                pendingAdjustment > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {pendingAdjustment > 0 ? '+' : ''}{pendingAdjustment} → {newQuantity}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.safety_stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canAdjustStock ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleQuickAdjust(item.variant_id, -1)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Decrease by 1"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(item.variant_id, 1)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Increase by 1"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <ShieldExclamationIcon className="h-4 w-4" />
                              <span>No permission</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'low-stock' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
              <button
                onClick={fetchLowStockItems}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Safety Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shortage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <ArrowPathIcon className="h-6 w-6 animate-spin mr-2" />
                        Loading low stock items...
                      </div>
                    </td>
                  </tr>
                ) : lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="text-center">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <p>No low stock items found</p>
                        <p className="text-sm">All products are adequately stocked!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((item) => (
                    <tr key={item.variant_id} className="hover:bg-red-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.product_title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.sku}
                            {(item.size || item.color) && (
                              <span className="ml-2">
                                {[item.size, item.color].filter(Boolean).join(' / ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-red-600">{item.current_quantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.safety_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-red-600">-{item.shortage}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {canAdjustStock ? (
                          <button
                            onClick={() => handleQuickAdjust(item.variant_id, item.shortage)}
                            className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg hover:bg-yellow-200 transition-colors"
                          >
                            Restock to Safety Level
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <ShieldExclamationIcon className="h-4 w-4" />
                            <span>No permission</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'adjust' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Stock Adjustments</h3>
            <p className="text-sm text-gray-600">
              Use the Overview tab to add items to your adjustment list, then apply them all at once here.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Reason
            </label>
            <input
              type="text"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              placeholder="e.g., Physical count, Damaged goods, etc."
            />
          </div>

          {adjustments.length === 0 ? (
            <div className="text-center py-12">
              <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No pending adjustments</p>
              <p className="text-sm text-gray-400">Use the quick adjust buttons in the Overview tab to add items</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Variant ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Adjustment
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.map((adj, index) => (
                      <tr key={adj.variant_id} className="border-b">
                        <td className="px-4 py-2 text-sm">{adj.variant_id}</td>
                        <td className="px-4 py-2">
                          <span className={`text-sm font-medium ${
                            adj.delta > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {adj.delta > 0 ? '+' : ''}{adj.delta}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => {
                              const newAdjustments = adjustments.filter((_, i) => i !== index)
                              setAdjustments(newAdjustments)
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleBulkAdjustment}
                  disabled={processing || adjustments.length === 0}
                  className="px-6 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? 'Applying...' : `Apply ${adjustments.length} Adjustments`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Access denied component for unauthorized users
function AccessDeniedInventory() {
  const { user } = useAuth()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow">
      <ShieldExclamationIcon className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 text-center mb-4 max-w-md">
        You don't have permission to access inventory management.
        {user?.role === 'operations' 
          ? ' Operations staff have limited inventory viewing permissions.'
          : ' Please contact an administrator for access.'}
      </p>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">
          Current role: <span className="font-medium text-gray-900">{user?.role}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Required: Admin, Supervisor, or Operations role with inventory permissions
        </p>
      </div>
    </div>
  )
}

// Main page component with comprehensive RBAC protection
export default function InventoryManagementPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'supervisor', 'operations', 'logistics']}>
      <PermissionGuard 
        permission={Permission.VIEW_INVENTORY}
        fallback={<AccessDeniedInventory />}
      >
        <InventoryManagementContent />
      </PermissionGuard>
    </RoleGuard>
  )
}
