'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useAuth, Permission } from '@/lib/auth-context'
import { PermissionGuard, RoleGuard } from '@/components/auth/permission-guards'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  ChartPieIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface SalesMetrics {
  total_revenue: number
  total_orders: number
  total_customers: number
  average_order_value: number
  revenue_growth: number
  order_growth: number
  customer_growth: number
  top_selling_products: TopProduct[]
  sales_by_category: CategorySales[]
  daily_sales: DailySales[]
  monthly_revenue: MonthlyRevenue[]
}

interface TopProduct {
  id: number
  title: string
  total_sold: number
  revenue: number
  growth_rate: number
}

interface CategorySales {
  category_name: string
  total_sales: number
  percentage: number
  growth: number
}

interface DailySales {
  date: string
  sales: number
  orders: number
}

interface MonthlyRevenue {
  month: string
  revenue: number
  orders: number
  growth: number
}

interface InventoryMetrics {
  total_products: number
  total_variants: number
  low_stock_items: number
  out_of_stock_items: number
  inventory_value: number
  top_categories: CategoryInventory[]
}

interface CategoryInventory {
  name: string
  product_count: number
  total_value: number
  low_stock_count: number
}

interface UserMetrics {
  total_users: number
  new_users_this_month: number
  active_users: number
  user_growth: number
  user_registration_trend: UserTrend[]
}

interface UserTrend {
  date: string
  new_users: number
  total_users: number
}

// Main reports dashboard content component
function ReportsDashboardContent() {
  const { user, hasPermission } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory' | 'customers'>('overview')
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)
  
  // Data state
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null)
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics | null>(null)
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null)
  
  // Permission checks
  const canViewReports = hasPermission(Permission.REPORT_VIEW)
  const canViewSalesReports = hasPermission(Permission.REPORT_VIEW)
  const canViewInventoryReports = hasPermission(Permission.REPORT_VIEW)
  const canViewCustomerReports = hasPermission(Permission.REPORT_VIEW)
  const canExportReports = hasPermission(Permission.REPORT_EXPORT)

  // Fetch reports data
  const fetchReportsData = async () => {
    try {
      setLoading(true)
      
      const promises = []
      
      if (canViewSalesReports) {
        promises.push(
          api<SalesMetrics>(`/api/admin/reports/sales?period=${dateRange}`)
            .then(data => setSalesMetrics(data))
            .catch(console.error)
        )
      }
      
      if (canViewInventoryReports) {
        promises.push(
          api<InventoryMetrics>(`/api/admin/reports/inventory`)
            .then(data => setInventoryMetrics(data))
            .catch(console.error)
        )
      }
      
      if (canViewCustomerReports) {
        promises.push(
          api<UserMetrics>(`/api/admin/reports/customers?period=${dateRange}`)
            .then(data => setUserMetrics(data))
            .catch(console.error)
        )
      }
      
      await Promise.allSettled(promises)
      
    } catch (error: any) {
      if (error?.message?.includes('Not authenticated') || error?.message?.includes('401')) {
        window.location.href = '/staff-login?error=authentication_required'
        return
      }
      
      if (!error?.message?.includes('401') && !error?.message?.includes('Not authenticated')) {
        console.error('Failed to fetch reports:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchReportsData()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchReportsData()
  }, [dateRange])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  // Export functionality
  const handleExport = async (type: 'sales' | 'inventory' | 'customers') => {
    if (!canExportReports) return
    
    try {
      const response = await api(`/api/admin/reports/export/${type}?period=${dateRange}`, {
        method: 'GET'
      })
      
      // Create download link
      const blob = new Blob([response as string], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_report_${dateRange}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export report:', error)
      alert('Failed to export report. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin text-maroon-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
            <p className="text-gray-600">Analytics and insights for business performance</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 3 months</option>
              <option value="365d">Last year</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Role-based access notice */}
        {user?.role === 'operations' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-700">
                <strong>Operations View:</strong> You have access to inventory reports and operational metrics.
              </p>
            </div>
          </div>
        )}
        
        {user?.role === 'logistics' && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <BuildingStorefrontIcon className="h-5 w-5 text-purple-600" />
              <p className="text-sm text-purple-700">
                <strong>Logistics View:</strong> Access to inventory and fulfillment reports to support operations planning.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: ChartBarIcon, permission: Permission.REPORT_VIEW },
              { key: 'sales', label: 'Sales Analytics', icon: CurrencyDollarIcon, permission: Permission.REPORT_VIEW },
              { key: 'inventory', label: 'Inventory Reports', icon: BuildingStorefrontIcon, permission: Permission.REPORT_VIEW },
              { key: 'customers', label: 'Customer Insights', icon: UsersIcon, permission: Permission.REPORT_VIEW }
            ].map(tab => {
              const Icon = tab.icon
              const hasTabPermission = hasPermission(tab.permission)
              
              if (!hasTabPermission) return null
              
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {canViewSalesReports && salesMetrics && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(salesMetrics.total_revenue)}
                      </p>
                      <p className={`text-sm flex items-center gap-1 ${
                        salesMetrics.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {salesMetrics.revenue_growth >= 0 ? 
                          <ArrowTrendingUpIcon className="h-4 w-4" /> : 
                          <ArrowTrendingDownIcon className="h-4 w-4" />
                        }
                        {formatPercentage(salesMetrics.revenue_growth)}
                      </p>
                    </div>
                    <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {salesMetrics.total_orders.toLocaleString()}
                      </p>
                      <p className={`text-sm flex items-center gap-1 ${
                        salesMetrics.order_growth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {salesMetrics.order_growth >= 0 ? 
                          <ArrowTrendingUpIcon className="h-4 w-4" /> : 
                          <ArrowTrendingDownIcon className="h-4 w-4" />
                        }
                        {formatPercentage(salesMetrics.order_growth)}
                      </p>
                    </div>
                    <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </>
            )}

            {canViewCustomerReports && userMetrics && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {userMetrics.total_users.toLocaleString()}
                    </p>
                    <p className={`text-sm flex items-center gap-1 ${
                      userMetrics.user_growth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {userMetrics.user_growth >= 0 ? 
                        <ArrowTrendingUpIcon className="h-4 w-4" /> : 
                        <ArrowTrendingDownIcon className="h-4 w-4" />
                      }
                      {formatPercentage(userMetrics.user_growth)}
                    </p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            )}

            {canViewInventoryReports && inventoryMetrics && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Inventory Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(inventoryMetrics.inventory_value)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {inventoryMetrics.total_products} products
                    </p>
                  </div>
                  <BuildingStorefrontIcon className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {canViewInventoryReports && inventoryMetrics && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Inventory Status</h3>
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Low Stock Items</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {inventoryMetrics.low_stock_items}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Out of Stock</span>
                    <span className="text-sm font-medium text-red-600">
                      {inventoryMetrics.out_of_stock_items}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Variants</span>
                    <span className="text-sm font-medium text-gray-900">
                      {inventoryMetrics.total_variants}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {canViewSalesReports && salesMetrics && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Top Selling Products</h3>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  {salesMetrics.top_selling_products.slice(0, 3).map((product, index) => (
                    <div key={product.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.total_sold} sold
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.revenue)}
                        </p>
                        <p className={`text-xs ${
                          product.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(product.growth_rate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sales Analytics Tab */}
      {activeTab === 'sales' && canViewSalesReports && salesMetrics && (
        <div className="space-y-6">
          {/* Export Button */}
          {canExportReports && (
            <div className="flex justify-end">
              <button
                onClick={() => handleExport('sales')}
                className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export Sales Report
              </button>
            </div>
          )}

          {/* Sales Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Average Order Value</h3>
              <p className="text-3xl font-bold text-maroon-600">
                {formatCurrency(salesMetrics.average_order_value)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Growth</h3>
              <p className={`text-3xl font-bold ${
                salesMetrics.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(salesMetrics.revenue_growth)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Growth</h3>
              <p className={`text-3xl font-bold ${
                salesMetrics.order_growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(salesMetrics.order_growth)}
              </p>
            </div>
          </div>

          {/* Sales by Category */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sales by Category</h3>
            <div className="space-y-4">
              {salesMetrics.sales_by_category.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {category.category_name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatCurrency(category.total_sales)} ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-maroon-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className={`ml-4 text-sm ${
                    category.growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(category.growth)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Top Selling Products</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Units Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Growth Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salesMetrics.top_selling_products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {product.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.total_sold}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(product.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${
                          product.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(product.growth_rate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Reports Tab */}
      {activeTab === 'inventory' && canViewInventoryReports && inventoryMetrics && (
        <div className="space-y-6">
          {/* Export Button */}
          {canExportReports && (
            <div className="flex justify-end">
              <button
                onClick={() => handleExport('inventory')}
                className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export Inventory Report
              </button>
            </div>
          )}

          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {inventoryMetrics.total_products}
                  </p>
                </div>
                <BuildingStorefrontIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {inventoryMetrics.low_stock_items}
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {inventoryMetrics.out_of_stock_items}
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inventory Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(inventoryMetrics.inventory_value)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Inventory by Category</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Low Stock Items
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventoryMetrics.top_categories.map((category, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {category.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {category.product_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(category.total_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${
                          category.low_stock_count > 0 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {category.low_stock_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Insights Tab */}
      {activeTab === 'customers' && canViewCustomerReports && userMetrics && (
        <div className="space-y-6">
          {/* Export Button */}
          {canExportReports && (
            <div className="flex justify-end">
              <button
                onClick={() => handleExport('customers')}
                className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export Customer Report
              </button>
            </div>
          )}

          {/* Customer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userMetrics.total_users.toLocaleString()}
                  </p>
                </div>
                <UsersIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">New This Month</p>
                  <p className="text-2xl font-bold text-green-600">
                    {userMetrics.new_users_this_month.toLocaleString()}
                  </p>
                </div>
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Customer Growth</p>
                  <p className={`text-2xl font-bold ${
                    userMetrics.user_growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(userMetrics.user_growth)}
                  </p>
                </div>
                <ChartBarIcon className={`h-8 w-8 ${
                  userMetrics.user_growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </div>

          {/* Customer Registration Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Registration Trend</h3>
            <div className="space-y-4">
              {userMetrics.user_registration_trend.slice(-10).map((trend, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {new Date(trend.date).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      +{trend.new_users} new users
                    </span>
                    <span className="text-sm text-gray-500">
                      Total: {trend.total_users}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Access denied component for unauthorized users
function AccessDeniedReports() {
  const { user } = useAuth()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow">
      <ShieldExclamationIcon className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 text-center mb-4 max-w-md">
        You don't have permission to access reports and analytics.
        {user?.role === 'operations' 
          ? ' Operations staff have limited access to operational reports only.'
          : user?.role === 'logistics'
          ? ' Logistics staff have limited access to inventory and fulfillment reports.'
          : ' Please contact an administrator for access.'}
      </p>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">
          Current role: <span className="font-medium text-gray-900">{user?.role}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Required: Admin or Supervisor role with reports permissions
        </p>
      </div>
    </div>
  )
}

// Main page component with comprehensive RBAC protection
export default function ReportsDashboardPage() {
  return (
    <RoleGuard roles={['admin', 'supervisor', 'operations', 'logistics']}>
      <PermissionGuard 
        permission={Permission.REPORT_VIEW}
        fallback={<AccessDeniedReports />}
      >
        <ReportsDashboardContent />
      </PermissionGuard>
    </RoleGuard>
  )
}
