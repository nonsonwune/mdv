"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, Button, Badge, EmptyState } from '../ui'
import { formatNaira } from '../../lib/format'
import type { UserData } from './UserProfile'
import type { Order } from './OrderHistory'
import type { Product } from '../../lib/types'

interface DashboardStats {
  totalOrders: number
  totalSpent: number
  loyaltyPoints: number
  savedItems: number
  recentOrders: Order[]
  recommendations: Product[]
  monthlySpending: Array<{ month: string; amount: number }>
}

interface UserDashboardProps {
  user: UserData
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0,
    savedItems: 0,
    recentOrders: [],
    recommendations: [],
    monthlySpending: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load orders from API
      const orders = await loadOrdersFromAPI()
      
      // Load wishlist from API
      const wishlist = await loadWishlistFromAPI()
      
      // Calculate stats from real data
      const totalSpent = orders.reduce((sum, order) => sum + order.total, 0)
      const loyaltyPoints = Math.floor(totalSpent / 100) // 1 point per ₦100
      
      // Get recent orders
      const recentOrders = orders
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
      
      // Calculate monthly spending
      const monthlySpending = calculateMonthlySpending(orders)
      
      // Load real product recommendations
      const recommendations = await loadRecommendations()
      
      setStats({
        totalOrders: orders.length,
        totalSpent,
        loyaltyPoints,
        savedItems: wishlist.length,
        recentOrders,
        recommendations,
        monthlySpending
      })
      
      // Cache the data in localStorage for offline access
      if (orders.length > 0) {
        localStorage.setItem('mdv_orders', JSON.stringify(orders))
      }
      if (wishlist.length > 0) {
        localStorage.setItem('mdv_wishlist', JSON.stringify(wishlist))
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Fallback to cached data if API fails
      const cachedOrders = JSON.parse(localStorage.getItem('mdv_orders') || '[]') as Order[]
      const cachedWishlist = JSON.parse(localStorage.getItem('mdv_wishlist') || '[]')
      
      if (cachedOrders.length > 0 || cachedWishlist.length > 0) {
        const totalSpent = cachedOrders.reduce((sum, order) => sum + order.total, 0)
        const loyaltyPoints = Math.floor(totalSpent / 100)
        const recentOrders = cachedOrders
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3)
        const monthlySpending = calculateMonthlySpending(cachedOrders)
        
        setStats({
          totalOrders: cachedOrders.length,
          totalSpent,
          loyaltyPoints,
          savedItems: cachedWishlist.length,
          recentOrders,
          recommendations: [],
          monthlySpending
        })
      } else {
        // No cached data, show empty state
        setStats({
          totalOrders: 0,
          totalSpent: 0,
          loyaltyPoints: 0,
          savedItems: 0,
          recentOrders: [],
          recommendations: [],
          monthlySpending: []
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateMonthlySpending = (orders: Order[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const currentMonth = new Date().getMonth()
    const spending: Array<{ month: string; amount: number }> = []
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12
      const monthName = months[monthIndex] || months[0]
      
      const monthOrders = orders.filter(order => {
        const orderMonth = new Date(order.date).getMonth()
        return orderMonth === monthIndex
      })
      
      const amount = monthOrders.reduce((sum, order) => sum + order.total, 0)
      spending.push({ month: monthName, amount })
    }
    
    return spending
  }

  const loadOrdersFromAPI = async (): Promise<Order[]> => {
    try {
      const response = await fetch('/api/orders', {
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.orders || []
      }
    } catch (error) {
      console.error('Error loading orders from API:', error)
    }
    return []
  }

  const loadWishlistFromAPI = async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/wishlist', {
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.items || []
      }
    } catch (error) {
      console.error('Error loading wishlist from API:', error)
    }
    return []
  }

  const loadRecommendations = async (): Promise<Product[]> => {
    try {
      // Fetch real product recommendations from backend API
      const response = await fetch('/api/products/recommendations', {
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.products || []
      }
    } catch (error) {
      console.error('Error loading recommendations:', error)
    }
    return []
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getTierProgress = () => {
    const tiers: Record<string, { min: number; max: number; next: string | null }> = {
      bronze: { min: 0, max: 100000, next: 'Silver' },
      silver: { min: 100000, max: 500000, next: 'Gold' },
      gold: { min: 500000, max: 1000000, next: 'Platinum' },
      platinum: { min: 1000000, max: Infinity, next: null }
    }
    
    const currentTier = tiers[user.loyaltyTier || 'bronze']
    const progress = ((stats.totalSpent - currentTier.min) / (currentTier.max - currentTier.min)) * 100
    const remaining = currentTier.max - stats.totalSpent
    
    return {
      progress: Math.min(progress, 100),
      remaining,
      nextTier: currentTier.next
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-neutral-200 rounded w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const tierProgress = getTierProgress()

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-maroon-700 to-maroon-800 text-white rounded-lg p-6">
        <h1 className="text-2xl text-white font-bold mb-2">
          {getGreeting()}, {user.firstName || user.name?.split(' ')[0] || 'User'}! 👋
        </h1>
        <p className="text-white/90">
          Welcome back to your dashboard. Here's what's happening with your account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
              <p className="text-xs text-neutral-500 mt-1">All time</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total Spent</p>
              <p className="text-2xl font-bold mt-1">{formatNaira(stats.totalSpent)}</p>
              <p className="text-xs text-green-600 mt-1">+12% this month</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-600">Loyalty Points</p>
              <p className="text-2xl font-bold mt-1">{stats.loyaltyPoints.toLocaleString()}</p>
              <p className="text-xs text-purple-600 mt-1">₦{(stats.loyaltyPoints * 10).toLocaleString()} value</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-600">Saved Items</p>
              <p className="text-2xl font-bold mt-1">{stats.savedItems}</p>
              <Link href="/women" className="text-xs text-maroon-700 mt-1 hover:underline">
                View wishlist →
              </Link>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Loyalty Tier Progress */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Loyalty Status</h3>
              <p className="text-sm text-neutral-600">
                Current tier: <span className="font-medium capitalize">{user.loyaltyTier || 'Bronze'}</span>
              </p>
            </div>
            <Badge variant="primary" size="sm">
              {stats.loyaltyPoints} Points
            </Badge>
          </div>
          
          {tierProgress.nextTier && (
            <>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress to {tierProgress.nextTier}</span>
                  <span>{tierProgress.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-maroon-600 to-maroon-700 h-2 rounded-full transition-all"
                    style={{ width: `${tierProgress.progress}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-neutral-600">
                Spend {formatNaira(tierProgress.remaining)} more to reach {tierProgress.nextTier} tier
              </p>
            </>
          )}
          
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-lg">🥉</span>
              </div>
              <p className="text-xs font-medium">Bronze</p>
              <p className="text-xs text-neutral-600">Starter</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg">🥈</span>
              </div>
              <p className="text-xs font-medium">Silver</p>
              <p className="text-xs text-neutral-600">₦100k+</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-lg">🥇</span>
              </div>
              <p className="text-xs font-medium">Gold</p>
              <p className="text-xs text-neutral-600">₦500k+</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-lg">💎</span>
              </div>
              <p className="text-xs font-medium">Platinum</p>
              <p className="text-xs text-neutral-600">₦1M+</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Orders</h3>
              <Link href="/account" className="text-sm text-maroon-700 hover:underline">
                View all →
              </Link>
            </div>
            
            {stats.recentOrders.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title="No orders yet"
                description="Your recent orders will appear here"
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-neutral-600">
                        {new Date(order.date).toLocaleDateString()} • {order.items.length} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatNaira(order.total)}</p>
                      <Badge variant={
                        order.status === 'delivered' ? 'success' : 
                        order.status === 'shipped' ? 'primary' : 'warning'
                      } size="sm">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Monthly Spending */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Spending</h3>
            <div className="space-y-3">
              {stats.monthlySpending.map((month, index) => (
                <div key={month.month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600">{month.month}</span>
                    <span className="font-medium">{formatNaira(month.amount)}</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-maroon-700 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.max((month.amount / Math.max(...stats.monthlySpending.map(m => m.amount))) * 100, 5)}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recommended for You</h3>
            <Link href="/women" className="text-sm text-maroon-700 hover:underline">
              Shop all →
            </Link>
          </div>
          
          {stats.recommendations.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              }
              title="No recommendations yet"
              description="Browse our collection to see personalized recommendations"
              size="sm"
              action={
                <Link href="/">
                  <Button>Explore Products</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.recommendations.map(product => (
                <Link key={product.id} href={`/product/${product.slug}`}>
                  <div className="group cursor-pointer">
                    <div className="aspect-square bg-neutral-100 rounded-lg overflow-hidden mb-3">
                      {product.images?.[0] && (
                        <Image
                          src={product.images[0].url}
                          alt={product.images[0].alt_text || product.title}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                    <h4 className="font-medium text-sm group-hover:text-maroon-700 transition-colors">
                      {product.title}
                    </h4>
                    <p className="text-xs text-neutral-600 mb-1">{product.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {formatNaira(product.variants?.[0]?.price || 0)}
                      </span>
                      {product.compare_at_price && (
                        <span className="text-xs text-neutral-500 line-through">
                          {formatNaira(product.compare_at_price)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/account">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium">Addresses</p>
            </div>
          </Card>
        </Link>

        <Link href="/account">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-sm font-medium">Payment</p>
            </div>
          </Card>
        </Link>

        <Link href="/account">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm font-medium">Notifications</p>
            </div>
          </Card>
        </Link>

        <Link href="/faq">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium">Help</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
