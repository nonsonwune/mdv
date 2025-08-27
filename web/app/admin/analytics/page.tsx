'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  ArrowPathIcon,
  EyeIcon,
  StarIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  revenue: {
    current: number
    previous: number
    change: number
    daily: { date: string; amount: number }[]
  }
  orders: {
    current: number
    previous: number
    change: number
    daily: { date: string; count: number }[]
    by_status: { status: string; count: number }[]
  }
  customers: {
    current: number
    previous: number
    change: number
    new_customers: number
    returning_customers: number
  }
  products: {
    total_products: number
    out_of_stock: number
    low_stock: number
    top_selling: {
      product_id: number
      product_title: string
      quantity_sold: number
      revenue: number
    }[]
  }
  geographic: {
    country: string
    orders: number
    revenue: number
  }[]
  conversion: {
    views: number
    add_to_cart: number
    purchases: number
    conversion_rate: number
  }
}

interface TimeRange {
  value: string
  label: string
}

const timeRanges: TimeRange[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '1y', label: 'Last year' }
]

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api<AnalyticsData>(`/api/admin/analytics?period=${timeRange}`)
      setData(response)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      // Set mock data for development
      setData({
        revenue: {
          current: 125000,
          previous: 98000,
          change: 27.6,
          daily: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: Math.floor(Math.random() * 5000) + 2000
          }))
        },
        orders: {
          current: 1250,
          previous: 980,
          change: 27.6,
          daily: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 50) + 20
          })),
          by_status: [
            { status: 'completed', count: 850 },
            { status: 'processing', count: 200 },
            { status: 'shipped', count: 150 },
            { status: 'pending', count: 50 }
          ]
        },
        customers: {
          current: 2340,
          previous: 2180,
          change: 7.3,
          new_customers: 340,
          returning_customers: 1910
        },
        products: {
          total_products: 125,
          out_of_stock: 8,
          low_stock: 15,
          top_selling: [
            { product_id: 1, product_title: 'Classic White T-Shirt', quantity_sold: 245, revenue: 6125 },
            { product_id: 2, product_title: 'Denim Jacket', quantity_sold: 180, revenue: 14400 },
            { product_id: 3, product_title: 'Running Shoes', quantity_sold: 160, revenue: 19200 },
            { product_id: 4, product_title: 'Leather Wallet', quantity_sold: 120, revenue: 7200 },
            { product_id: 5, product_title: 'Casual Hoodie', quantity_sold: 95, revenue: 5700 }
          ]
        },
        geographic: [
          { country: 'United States', orders: 750, revenue: 75000 },
          { country: 'Canada', orders: 180, revenue: 18000 },
          { country: 'United Kingdom', orders: 120, revenue: 12000 },
          { country: 'Australia', orders: 90, revenue: 9000 },
          { country: 'Germany', orders: 60, revenue: 6000 }
        ],
        conversion: {
          views: 15000,
          add_to_cart: 2250,
          purchases: 1250,
          conversion_rate: 8.33
        }
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`
  }

  const getTrendIcon = (change: number) => {
    return change >= 0 ? TrendingUpIcon : TrendingDownIcon
  }

  const getTrendColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Business insights and performance metrics</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {!data ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No analytics data available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.revenue.change)}`}>
                  {(() => {
                    const TrendIcon = getTrendIcon(data.revenue.change)
                    return <TrendIcon className="h-4 w-4" />
                  })()}
                  {formatPercentage(data.revenue.change)}
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenue.current)}</p>
                <p className="text-gray-600 text-sm">Revenue</p>
                <p className="text-gray-500 text-xs">vs {formatCurrency(data.revenue.previous)} previous period</p>
              </div>
            </div>

            {/* Orders */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.orders.change)}`}>
                  {(() => {
                    const TrendIcon = getTrendIcon(data.orders.change)
                    return <TrendIcon className="h-4 w-4" />
                  })()}
                  {formatPercentage(data.orders.change)}
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(data.orders.current)}</p>
                <p className="text-gray-600 text-sm">Orders</p>
                <p className="text-gray-500 text-xs">vs {formatNumber(data.orders.previous)} previous period</p>
              </div>
            </div>

            {/* Customers */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.customers.change)}`}>
                  {(() => {
                    const TrendIcon = getTrendIcon(data.customers.change)
                    return <TrendIcon className="h-4 w-4" />
                  })()}
                  {formatPercentage(data.customers.change)}
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(data.customers.current)}</p>
                <p className="text-gray-600 text-sm">Customers</p>
                <p className="text-gray-500 text-xs">vs {formatNumber(data.customers.previous)} previous period</p>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="text-sm text-gray-600">
                  <EyeIcon className="h-4 w-4 inline mr-1" />
                  {formatNumber(data.conversion.views)}
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.conversion.conversion_rate.toFixed(1)}%</p>
                <p className="text-gray-600 text-sm">Conversion Rate</p>
                <p className="text-gray-500 text-xs">{formatNumber(data.conversion.purchases)} / {formatNumber(data.conversion.views)} visitors</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
                <p className="text-sm text-gray-600">Daily revenue over the selected period</p>
              </div>
              <div className="p-6">
                {/* Simple Chart Representation */}
                <div className="space-y-2">
                  {data.revenue.daily.slice(-7).map((day, index) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-16 text-xs text-gray-500">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(day.amount / Math.max(...data.revenue.daily.map(d => d.amount))) * 100}%` }}
                        />
                      </div>
                      <div className="w-20 text-xs text-gray-700 text-right">
                        {formatCurrency(day.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Top Selling Products</h3>
                <p className="text-sm text-gray-600">Best performers by quantity sold</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {data.products.top_selling.map((product, index) => (
                    <div key={product.product_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-maroon-100 text-maroon-700 rounded-full text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.product_title}</p>
                          <p className="text-sm text-gray-500">{product.quantity_sold} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Status Breakdown */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Order Status</h3>
                <p className="text-sm text-gray-600">Breakdown by status</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {data.orders.by_status.map(status => (
                    <div key={status.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          status.status === 'completed' ? 'bg-green-500' :
                          status.status === 'processing' ? 'bg-blue-500' :
                          status.status === 'shipped' ? 'bg-purple-500' :
                          'bg-yellow-500'
                        }`}></div>
                        <span className="text-sm text-gray-700 capitalize">{status.status}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{status.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Customer Insights */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Customer Insights</h3>
                <p className="text-sm text-gray-600">New vs returning customers</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-gray-700">New Customers</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatNumber(data.customers.new_customers)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-700">Returning Customers</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatNumber(data.customers.returning_customers)}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      {((data.customers.returning_customers / data.customers.current) * 100).toFixed(1)}% retention rate
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Inventory Status</h3>
                <p className="text-sm text-gray-600">Stock level overview</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Total Products</span>
                    <span className="text-sm font-medium text-gray-900">{formatNumber(data.products.total_products)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm text-gray-700">Out of Stock</span>
                    </div>
                    <span className="text-sm font-medium text-red-600">{data.products.out_of_stock}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-gray-700">Low Stock</span>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">{data.products.low_stock}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      {(((data.products.total_products - data.products.out_of_stock - data.products.low_stock) / data.products.total_products) * 100).toFixed(1)}% healthy stock
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Geographic Performance */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Geographic Performance</h3>
              <p className="text-sm text-gray-600">Sales by country/region</p>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-sm font-medium text-gray-700">Country</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700">Orders</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700">Revenue</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.geographic.map((country, index) => (
                      <tr key={country.country}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{country.country}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-sm text-gray-900">{formatNumber(country.orders)}</td>
                        <td className="py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(country.revenue)}</td>
                        <td className="py-3 text-right text-sm text-gray-500">
                          {((country.revenue / data.revenue.current) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
