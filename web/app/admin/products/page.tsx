'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useAuth, Permission } from '@/lib/auth-context'
import { PermissionGuard, RoleGuard } from '@/components/auth/permission-guards'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MinusIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  ShieldExclamationIcon,
  TagIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface Product {
  id: number
  title: string
  slug: string
  category_name?: string
  variant_count: number
  total_inventory: number
  low_stock_count: number
  image_url?: string
  min_price: number
  max_price: number
  created_at: string
  variants?: ProductVariant[]
}

interface ProductVariant {
  id: number
  sku: string
  size?: string
  color?: string
  price: number
  quantity: number
  safety_stock: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

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

interface StockAdjustment {
  variant_id: number
  delta: number
  reason: string
  product_title?: string
  sku?: string
}

// Main unified product & inventory management component
function ProductInventoryContent() {
  const router = useRouter()
  const { user, hasPermission, isRole } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    product: any
    hasOrders: boolean
    orderCount?: number
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Check if user has permission to view products
  useEffect(() => {
    if (!hasPermission(Permission.PRODUCT_VIEW)) {
      router.push('/admin?error=unauthorized')
    }
  }, [hasPermission, router])

  useEffect(() => {
    fetchProducts()
  }, [currentPage, searchTerm])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '20'
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await api<any>(`/api/admin/products?${params}`)
      setProducts(response.items || [])
      setTotalPages(response.total_pages || 1)
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error?.message?.includes('Not authenticated') || error?.message?.includes('401')) {
        // Redirect to staff login for authentication
        window.location.href = '/staff-login?error=authentication_required'
        return
      }
      
      // Only log non-auth errors
      if (!error?.message?.includes('401') && !error?.message?.includes('Not authenticated')) {
        console.error('Failed to fetch products:', error)
      }
      
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (product: any) => {
    try {
      // First attempt normal deletion
      await api(`/api/admin/products/${product.id}`, {
        method: 'DELETE'
      })
      fetchProducts()
    } catch (error: any) {
      // Check if it's a 409 conflict (product has orders)
      if (error.message?.includes('409') || error.message?.includes('associated orders')) {
        // Show confirmation dialog for force deletion
        setDeleteConfirm({
          product,
          hasOrders: true,
          orderCount: undefined // We could fetch this if needed
        })
      } else {
        console.error('Failed to delete product:', error)
        alert('Failed to delete product: ' + (error.message || 'Unknown error'))
      }
    }
  }

  const confirmForceDelete = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    try {
      await api(`/api/admin/products/${deleteConfirm.product.id}?force=true`, {
        method: 'DELETE'
      })
      setDeleteConfirm(null)
      fetchProducts()
    } catch (error: any) {
      console.error('Failed to force delete product:', error)
      alert('Failed to delete product: ' + (error.message || 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchProducts()
  }

  if (loading && products.length === 0) {
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
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600">
              Manage your product catalog
              {isRole('logistics') && (
                <span className="text-amber-600"> (View Only)</span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Quick Stock Update for Operations/Supervisor/Admin */}
            <PermissionGuard permission={Permission.INVENTORY_ADJUST}>
              <Link
                href={"/admin/inventory" as any}
                className="flex items-center gap-2 px-4 py-2 border border-maroon-300 text-maroon-700 rounded-lg hover:bg-maroon-50 transition-colors"
              >
                <CubeIcon className="h-5 w-5" />
                Update Stock
              </Link>
            </PermissionGuard>
            
            {/* Add Product for Admin/Supervisor only */}
            <PermissionGuard permission={Permission.PRODUCT_CREATE}>
              <Link
                href={"/admin/products/new" as any}
                className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Add Product
              </Link>
            </PermissionGuard>
          </div>
        </div>
        
        {/* Role-specific notices */}
        {isRole('operations') && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                <strong>Operations Role:</strong> You can view and edit products, update inventory, but cannot create new products or categories.
              </p>
            </div>
          </div>
        )}
        
        {isRole('logistics') && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                <strong>Logistics Role:</strong> You have view-only access to products. Focus on order fulfillment and shipments.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
            </button>
          </form>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventory
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
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 flex-shrink-0">
                          {product.image_url ? (
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={product.image_url}
                              alt={product.title}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <PhotoIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.variant_count} variant{product.variant_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{product.min_price.toLocaleString()}
                      {product.max_price !== product.min_price && (
                        <span> - ₦{product.max_price.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.total_inventory} units</div>
                      {product.low_stock_count > 0 && (
                        <div className="text-xs text-red-600">
                          {product.low_stock_count} low stock
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.total_inventory === 0
                            ? 'bg-red-100 text-red-800'
                            : product.low_stock_count > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {product.total_inventory === 0
                          ? 'Out of Stock'
                          : product.low_stock_count > 0
                          ? 'Low Stock'
                          : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {/* View/Edit Link - Different behavior based on role */}
                        {isRole('logistics') ? (
                          <Link
                            href={`/admin/products/${product.id}` as any}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <PhotoIcon className="h-5 w-5" />
                          </Link>
                        ) : (
                          <PermissionGuard permission={Permission.PRODUCT_EDIT}>
                            <Link
                              href={`/admin/products/${product.id}/edit` as any}
                              className="text-maroon-600 hover:text-maroon-900"
                              title={isRole('operations') ? 'Edit Product (Stock Only)' : 'Edit Product'}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Link>
                          </PermissionGuard>
                        )}
                        
                        {/* Quick Stock Update for Operations */}
                        {isRole('operations') && (
                          <Link
                            href={`/admin/inventory?variant=${product.id}` as any}
                            className="text-green-600 hover:text-green-900"
                            title="Update Stock"
                          >
                            <CubeIcon className="h-5 w-5" />
                          </Link>
                        )}
                        
                        {/* Delete - Admin only */}
                        <PermissionGuard permission={Permission.PRODUCT_DELETE}>
                          <button
                            onClick={() => handleDelete(product)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Product"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </PermissionGuard>
                        
                        {/* Show restricted message for logistics */}
                        {isRole('logistics') && (
                          <span className="text-xs text-gray-400 italic ml-2">
                            View Only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
      {/* Enhanced Inventory Management Section */}
      <PermissionGuard permission={Permission.INVENTORY_VIEW}>
        <InventoryManagementSection products={products} onUpdateStock={fetchProducts} />
      </PermissionGuard>
    </div>
  )
}

// Inventory Management Section Component
function InventoryManagementSection({ products, onUpdateStock }: { 
  products: Product[], 
  onUpdateStock: () => void 
}) {
  const { hasPermission, isRole } = useAuth()
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'low-stock' | 'adjustments'>('overview')

  // Fetch low stock items
  const fetchLowStockItems = async () => {
    try {
      setLoading(true)
      const response = await api<{ items: LowStockItem[] }>('/api/admin/inventory/low-stock')
      setLowStockItems(response.items || [])
    } catch (error) {
      console.error('Failed to fetch low stock items:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle stock adjustment
  const handleStockAdjustment = async (variantId: number, delta: number, reason: string) => {
    try {
      await api('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          adjustments: [{ variant_id: variantId, delta, reason }]
        })
      })
      
      // Update local state
      setStockAdjustments(prev => [...prev, { variant_id: variantId, delta, reason }])
      onUpdateStock() // Refresh parent data
      fetchLowStockItems() // Refresh low stock items
    } catch (error) {
      console.error('Failed to adjust stock:', error)
      alert('Failed to adjust stock')
    }
  }

  useEffect(() => {
    if (activeTab === 'low-stock') {
      fetchLowStockItems()
    }
  }, [activeTab])

  return (
    <div className="bg-white rounded-lg shadow mt-8">
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CubeIcon className="h-6 w-6 text-maroon-600" />
                Inventory Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Monitor stock levels, adjust inventory, and track low-stock items
                {isRole('logistics') && (
                  <span className="text-amber-600 ml-2">(View Only)</span>
                )}
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <PermissionGuard permission={Permission.INVENTORY_ADJUST}>
                <Link
                  href={"/admin/inventory" as any}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-maroon-100 text-maroon-700 rounded-lg hover:bg-maroon-200 transition-colors"
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4" />
                  Manage Inventory
                </Link>
              </PermissionGuard>
              
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { key: 'overview', label: 'Overview', icon: ChartBarIcon },
              { key: 'low-stock', label: 'Low Stock Alerts', icon: ExclamationTriangleIcon },
              { key: 'adjustments', label: 'Recent Adjustments', icon: ClockIcon }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`${activeTab === tab.key
                  ? 'border-maroon-500 text-maroon-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <InventoryOverview products={products} />
        )}
        
        {activeTab === 'low-stock' && (
          <LowStockAlerts 
            items={lowStockItems} 
            loading={loading}
            onStockAdjustment={handleStockAdjustment}
          />
        )}
        
        {activeTab === 'adjustments' && (
          <RecentAdjustments adjustments={stockAdjustments} />
        )}
      </div>
    </div>
  )
}

// Inventory Overview Component
function InventoryOverview({ products }: { products: Product[] }) {
  const totalProducts = products.length
  const totalInventory = products.reduce((sum, p) => sum + p.total_inventory, 0)
  const lowStockProducts = products.filter(p => p.low_stock_count > 0).length
  const outOfStockProducts = products.filter(p => p.total_inventory === 0).length

  const stats = [
    {
      name: 'Total Products',
      value: totalProducts,
      icon: BuildingStorefrontIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Total Inventory',
      value: `${totalInventory.toLocaleString()} units`,
      icon: CubeIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Low Stock Alerts',
      value: lowStockProducts,
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      name: 'Out of Stock',
      value: outOfStockProducts,
      icon: ShieldExclamationIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ]

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Out of Stock Items */}
        <div className="border border-red-200 rounded-lg">
          <div className="p-4 border-b border-red-200 bg-red-50">
            <h3 className="text-lg font-medium text-red-900 flex items-center gap-2">
              <ShieldExclamationIcon className="h-5 w-5" />
              Out of Stock
            </h3>
          </div>
          <div className="p-4">
            {outOfStockProducts === 0 ? (
              <p className="text-gray-500 text-center py-4">No out of stock items</p>
            ) : (
              <div className="space-y-2">
                {products
                  .filter(p => p.total_inventory === 0)
                  .slice(0, 5)
                  .map((product) => (
                    <div key={product.id} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{product.title}</span>
                      <Link
                        href={`/admin/products/${product.id}/edit` as any}
                        className="text-maroon-600 hover:text-maroon-800 text-sm"
                      >
                        Restock →
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="border border-yellow-200 rounded-lg">
          <div className="p-4 border-b border-yellow-200 bg-yellow-50">
            <h3 className="text-lg font-medium text-yellow-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Low Stock Warnings
            </h3>
          </div>
          <div className="p-4">
            {lowStockProducts === 0 ? (
              <p className="text-gray-500 text-center py-4">No low stock warnings</p>
            ) : (
              <div className="space-y-2">
                {products
                  .filter(p => p.low_stock_count > 0)
                  .slice(0, 5)
                  .map((product) => (
                    <div key={product.id} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{product.title}</span>
                        <span className="text-xs text-yellow-600 ml-2">
                          ({product.low_stock_count} variants)
                        </span>
                      </div>
                      <Link
                        href={`/admin/products/${product.id}/edit` as any}
                        className="text-maroon-600 hover:text-maroon-800 text-sm"
                      >
                        View →
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Low Stock Alerts Component
function LowStockAlerts({ 
  items, 
  loading, 
  onStockAdjustment 
}: { 
  items: LowStockItem[], 
  loading: boolean,
  onStockAdjustment: (variantId: number, delta: number, reason: string) => void
}) {
  const { hasPermission } = useAuth()
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState<number | null>(null)
  const [adjustmentValue, setAdjustmentValue] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')

  const handleQuickAdjustment = (item: LowStockItem) => {
    const delta = parseInt(adjustmentValue)
    if (isNaN(delta) || delta === 0) {
      alert('Please enter a valid adjustment amount')
      return
    }
    
    onStockAdjustment(item.variant_id, delta, adjustmentReason || 'Quick restock adjustment')
    setAdjustmentModalOpen(null)
    setAdjustmentValue('')
    setAdjustmentReason('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700"></div>
      </div>
    )
  }

  return (
    <div>
      {items.length === 0 ? (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Stock Levels Good!</h3>
          <p className="text-gray-500">No items are currently below their safety stock levels.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {items.length} Item{items.length !== 1 ? 's' : ''} Need Attention
            </h3>
            <div className="text-sm text-gray-600">
              Items below safety stock levels
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Safety Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shortage</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={`${item.product_id}-${item.variant_id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{item.product_title}</div>
                        <div className="text-sm text-gray-500">
                          {item.sku} {item.size && `• ${item.size}`} {item.color && `• ${item.color}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="text-red-600 font-semibold">{item.current_quantity}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.safety_stock}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-red-600 font-semibold">-{item.shortage}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {hasPermission(Permission.INVENTORY_ADJUST) ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setAdjustmentModalOpen(item.variant_id)}
                            className="text-maroon-600 hover:text-maroon-900"
                          >
                            Adjust Stock
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Adjustment Modal */}
      {adjustmentModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Quick Stock Adjustment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Amount
                </label>
                <input
                  type="number"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  placeholder="Enter quantity to add"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., Received new shipment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setAdjustmentModalOpen(null)
                  setAdjustmentValue('')
                  setAdjustmentReason('')
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const item = items.find(i => i.variant_id === adjustmentModalOpen)
                  if (item) handleQuickAdjustment(item)
                }}
                className="px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800"
              >
                Adjust Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Recent Adjustments Component
function RecentAdjustments({ adjustments }: { adjustments: StockAdjustment[] }) {
  return (
    <div>
      {adjustments.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Adjustments</h3>
          <p className="text-gray-500">Stock adjustments made during this session will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Recent Adjustments ({adjustments.length})
          </h3>
          <div className="space-y-3">
            {adjustments.map((adjustment, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    {adjustment.product_title || `Variant ${adjustment.variant_id}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {adjustment.sku && `SKU: ${adjustment.sku} • `}
                    {adjustment.reason || 'No reason provided'}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${
                    adjustment.delta > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {adjustment.delta > 0 ? '+' : ''}{adjustment.delta}
                  </div>
                  <div className="text-xs text-gray-500">units</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Force Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Product Has Orders
                </h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                The product <strong>"{deleteConfirm.product.title}"</strong> cannot be deleted because it has associated orders.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      Warning: Force Deletion
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Force deleting this product will:
                    </p>
                    <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                      <li>Remove the product permanently</li>
                      <li>Keep existing orders intact (orders will show "Deleted Product")</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                <strong>Alternative:</strong> Consider deactivating the product instead of deleting it to preserve order history.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmForceDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Force Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
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

// Main exported component with route and permission guards
export default function ProductsManagement() {
  return (
    <RoleGuard roles={['admin', 'supervisor', 'operations', 'logistics']}>
      <PermissionGuard 
        permission={Permission.PRODUCT_VIEW}
        fallback={<AccessDenied />}
      >
        <ProductInventoryContent />
      </PermissionGuard>
    </RoleGuard>
  )
}
