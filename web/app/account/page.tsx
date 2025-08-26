"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Button } from '../../components/ui'
import UserDashboard from '../../components/account/UserDashboard'
import UserProfile from '../../components/account/UserProfile'
import OrderHistory from '../../components/account/OrderHistory'
import AccountSettings from '../../components/account/AccountSettings'
import { API_BASE } from '../../lib/api'
import { useToast } from '../_components/ToastProvider'

interface UserData {
  id: number
  email: string
  name: string
  firstName?: string
  lastName?: string
  phone?: string
  loyaltyTier?: string
  createdAt?: string
  joinedDate?: string
  verified?: boolean
  totalOrders?: number
  totalSpent?: number
}

export default function AccountPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const router = useRouter()
  const toast = useToast()

  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    try {
      // Check if user is authenticated
      const tokenResponse = await fetch('/api/auth/check')
      if (!tokenResponse.ok) {
        router.push('/login?next=/account')
        return
      }

      // Fetch user profile through local API proxy
      const response = await fetch('/api/users/profile', {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login?next=/account')
          return
        }
        throw new Error('Failed to load user data')
      }

      const userData = await response.json()
      
      // Parse name for first/last
      const nameParts = userData.name?.split(' ') || []
      const firstName = nameParts[0] || 'User'
      const lastName = nameParts.slice(1).join(' ') || ''

      setUser({
        ...userData,
        firstName,
        lastName,
        loyaltyTier: 'bronze', // Default tier
        joinedDate: userData.createdAt || new Date().toISOString(),
        verified: true,
        totalOrders: 0,
        totalSpent: 0
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Failed to load account data', 'Please try refreshing the page')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout', 'Please try again')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-1/4 mb-8" />
            <div className="grid md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <div className="h-64 bg-neutral-200 rounded" />
              </div>
              <div className="md:col-span-3">
                <div className="h-96 bg-neutral-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-semibold mb-4">Account Access Required</h1>
          <p className="text-neutral-600 mb-6">Please sign in to view your account</p>
          <Button onClick={() => router.push('/login?next=/account')}>
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-neutral-600 mb-6">
          <Link href="/" className="hover:text-maroon-700">Home</Link>
          <span>/</span>
          <span className="text-neutral-900">My Account</span>
        </nav>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card className="p-6">
              {/* User Info */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-maroon-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-semibold text-maroon-700">
                    {user.firstName?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <h2 className="font-semibold text-lg">{user.name}</h2>
                <p className="text-sm text-neutral-600">{user.email}</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 bg-maroon-100 text-maroon-700 text-xs rounded-full">
                    {user.loyaltyTier?.toUpperCase() || 'BRONZE'} MEMBER
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'dashboard' 
                      ? 'bg-maroon-50 text-maroon-700' 
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'orders' 
                      ? 'bg-maroon-50 text-maroon-700' 
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Orders
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'profile' 
                      ? 'bg-maroon-50 text-maroon-700' 
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'addresses' 
                      ? 'bg-maroon-50 text-maroon-700' 
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Addresses
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('wishlist')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'wishlist' 
                      ? 'bg-maroon-50 text-maroon-700' 
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Wishlist
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'settings' 
                      ? 'bg-maroon-50 text-maroon-700' 
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </div>
                </button>

                <hr className="my-2" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100 text-danger"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </div>
                </button>
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {activeTab === 'dashboard' && <UserDashboard user={user} />}
            
            {activeTab === 'orders' && <OrderHistory userId={user.id} />}
            
            {activeTab === 'profile' && (
              <UserProfile 
                user={user} 
                onUpdate={(updatedUser) => setUser({ ...user, ...updatedUser })}
              />
            )}
            
            {activeTab === 'addresses' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Saved Addresses</h2>
                <AddressManager userId={user.id} />
              </Card>
            )}
            
            {activeTab === 'wishlist' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">My Wishlist</h2>
                <WishlistManager />
              </Card>
            )}
            
            {activeTab === 'settings' && (
              <AccountSettings 
                user={user}
                onUpdate={(updatedUser) => setUser({ ...user, ...updatedUser })}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Address Manager Component
function AddressManager({ userId }: { userId: number }) {
  const [addresses, setAddresses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    loadAddresses()
  }, [])

  async function loadAddresses() {
    try {
      const response = await fetch(`${API_BASE}/api/users/addresses`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setAddresses(data)
      }
    } catch (error) {
      console.error('Error loading addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-32 bg-neutral-100 rounded" />
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-neutral-600 mb-4">No saved addresses yet</p>
        <Button>Add Address</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {addresses.map((address, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{address.name}</p>
              <p className="text-sm text-neutral-600">{address.street}</p>
              <p className="text-sm text-neutral-600">{address.city}, {address.state}</p>
              <p className="text-sm text-neutral-600">Phone: {address.phone}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost">Edit</Button>
              <Button size="sm" variant="ghost" className="text-danger">Delete</Button>
            </div>
          </div>
        </div>
      ))}
      <Button className="w-full">Add New Address</Button>
    </div>
  )
}

// Wishlist Manager Component
function WishlistManager() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    loadWishlist()
  }, [])

  async function loadWishlist() {
    try {
      const response = await fetch(`${API_BASE}/api/wishlist`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Error loading wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  async function removeItem(itemId: number) {
    try {
      const response = await fetch(`${API_BASE}/api/wishlist/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        setItems(items.filter(item => item.id !== itemId))
        toast.success('Item removed from wishlist')
      }
    } catch (error) {
      console.error('Error removing item:', error)
      toast.error('Failed to remove item')
    }
  }

  if (loading) {
    return <div className="animate-pulse h-32 bg-neutral-100 rounded" />
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <p className="text-neutral-600 mb-4">Your wishlist is empty</p>
        <Link href="/">
          <Button>Start Shopping</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.id} className="border rounded-lg p-4">
          <div className="flex gap-4">
            {item.image_url && (
              <img 
                src={item.image_url} 
                alt={item.product_name}
                className="w-20 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium">{item.product_name}</h3>
              <p className="text-lg font-semibold text-maroon-700">
                ₦{item.price?.toLocaleString()}
              </p>
              <div className="flex gap-2 mt-2">
                <Button size="sm">Add to Cart</Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => removeItem(item.id)}
                  className="text-danger"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
