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
} from '@heroicons/react/24/outline'

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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch actual stats from API
      setStats({
        totalProducts: 0,
        totalOrders: 0,
        totalUsers: 1,
        totalRevenue: 0,
        productChange: 0,
        orderChange: 0,
        userChange: 0,
        revenueChange: 0,
        recentOrders: [],
        lowStockProducts: []
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to MDV Admin Panel</p>
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
            {stats?.recentOrders.length ? (
              <div className="space-y-4">
                {/* Order items would go here */}
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
            {stats?.lowStockProducts.length ? (
              <div className="space-y-4">
                {/* Low stock items would go here */}
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
      </div>
    </div>
  )
}

