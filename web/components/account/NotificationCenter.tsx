"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, Button, Badge, EmptyState, Modal, Alert } from '../ui'
import { formatNaira } from '../../lib/format'

// Simple Toggle component inline
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`
      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
      ${checked ? 'bg-maroon-700' : 'bg-neutral-300'}
    `}
  >
    <span
      className={`
        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
        ${checked ? 'translate-x-6' : 'translate-x-1'}
      `}
    />
  </button>
)

interface Notification {
  id: string
  type: 'order' | 'shipping' | 'promotion' | 'account' | 'review' | 'loyalty' | 'system'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  icon?: string
  priority: 'low' | 'medium' | 'high'
  metadata?: {
    orderId?: string
    trackingNumber?: string
    points?: number
    discount?: number
    productName?: string
  }
}

interface NotificationPreferences {
  orders: boolean
  shipping: boolean
  promotions: boolean
  reviews: boolean
  loyalty: boolean
  system: boolean
  emailAlerts: boolean
  pushNotifications: boolean
  smsAlerts: boolean
}

interface NotificationStats {
  total: number
  unread: number
  today: number
  thisWeek: number
  byType: Record<string, number>
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    orders: true,
    shipping: true,
    promotions: true,
    reviews: true,
    loyalty: true,
    system: true,
    emailAlerts: true,
    pushNotifications: false,
    smsAlerts: false
  })
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    today: 0,
    thisWeek: 0,
    byType: {}
  })
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  useEffect(() => {
    filterNotifications()
  }, [notifications, activeTab, selectedType])

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const loadNotifications = () => {
    // Mock notifications
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'order',
        title: 'Order Confirmed',
        message: 'Your order #ORD-2024-001 has been confirmed and is being processed.',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/account/orders',
        actionLabel: 'View Order',
        icon: '📦',
        priority: 'high',
        metadata: { orderId: 'ORD-2024-001' }
      },
      {
        id: '2',
        type: 'shipping',
        title: 'Package Shipped',
        message: 'Your order has been shipped and will arrive in 3-5 business days.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        actionUrl: '/tracking',
        actionLabel: 'Track Package',
        icon: '🚚',
        priority: 'high',
        metadata: { trackingNumber: 'TRK123456789' }
      },
      {
        id: '3',
        type: 'promotion',
        title: 'Flash Sale Alert!',
        message: 'Get 30% off on all summer collection. Limited time offer!',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true,
        actionUrl: '/shop/sale',
        actionLabel: 'Shop Now',
        icon: '🎉',
        priority: 'medium',
        metadata: { discount: 30 }
      },
      {
        id: '4',
        type: 'loyalty',
        title: 'Points Earned',
        message: 'You\'ve earned 500 loyalty points from your recent purchase!',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: false,
        actionUrl: '/account/loyalty',
        actionLabel: 'View Points',
        icon: '🎁',
        priority: 'medium',
        metadata: { points: 500 }
      },
      {
        id: '5',
        type: 'review',
        title: 'Review Reminder',
        message: 'How was your experience with Classic White Shirt? Share your review and earn 50 points.',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        read: true,
        actionUrl: '/account/reviews',
        actionLabel: 'Write Review',
        icon: '⭐',
        priority: 'low',
        metadata: { productName: 'Classic White Shirt', points: 50 }
      },
      {
        id: '6',
        type: 'account',
        title: 'Profile Updated',
        message: 'Your profile information has been successfully updated.',
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        read: true,
        icon: '✅',
        priority: 'low'
      },
      {
        id: '7',
        type: 'system',
        title: 'New Features Available',
        message: 'Check out our new virtual try-on feature for a better shopping experience!',
        timestamp: new Date(Date.now() - 345600000).toISOString(),
        read: true,
        actionUrl: '/features',
        actionLabel: 'Learn More',
        icon: '🆕',
        priority: 'low'
      },
      {
        id: '8',
        type: 'promotion',
        title: 'Exclusive Offer for You',
        message: 'As a valued customer, enjoy free shipping on your next order!',
        timestamp: new Date(Date.now() - 432000000).toISOString(),
        read: false,
        actionUrl: '/shop',
        actionLabel: 'Shop Now',
        icon: '💝',
        priority: 'medium'
      },
      {
        id: '9',
        type: 'order',
        title: 'Order Delivered',
        message: 'Your order #ORD-2023-999 has been delivered successfully.',
        timestamp: new Date(Date.now() - 604800000).toISOString(),
        read: true,
        icon: '✅',
        priority: 'medium',
        metadata: { orderId: 'ORD-2023-999' }
      },
      {
        id: '10',
        type: 'loyalty',
        title: 'Points Expiring Soon',
        message: '250 points will expire on March 31st. Use them before they\'re gone!',
        timestamp: new Date(Date.now() - 691200000).toISOString(),
        read: false,
        actionUrl: '/account/loyalty',
        actionLabel: 'Use Points',
        icon: '⏰',
        priority: 'high',
        metadata: { points: 250 }
      }
    ]

    setNotifications(mockNotifications)
    calculateStats(mockNotifications)
    setLoading(false)
  }

  const calculateStats = (notificationList: Notification[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const byType: Record<string, number> = {}
    let todayCount = 0
    let weekCount = 0

    notificationList.forEach(notif => {
      byType[notif.type] = (byType[notif.type] || 0) + 1
      
      const notifDate = new Date(notif.timestamp)
      if (notifDate >= today) todayCount++
      if (notifDate >= weekAgo) weekCount++
    })

    setStats({
      total: notificationList.length,
      unread: notificationList.filter(n => !n.read).length,
      today: todayCount,
      thisWeek: weekCount,
      byType
    })
  }

  const filterNotifications = () => {
    let filtered = [...notifications]

    // Filter by read status
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read)
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.type === selectedType)
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setFilteredNotifications(filtered)
  }

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
    setToastMessage('All notifications marked as read')
    setShowToast(true)
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id))
    setToastMessage('Notification deleted')
    setShowToast(true)
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setShowClearModal(false)
    setToastMessage('All notifications cleared')
    setShowToast(true)
  }

  const savePreferences = () => {
    localStorage.setItem('mdv_notification_preferences', JSON.stringify(preferences))
    setToastMessage('Notification preferences saved')
    setShowToast(true)
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      order: '📦',
      shipping: '🚚',
      promotion: '🎉',
      account: '👤',
      review: '⭐',
      loyalty: '🎁',
      system: '🔔'
    }
    return icons[type] || '📌'
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      order: 'blue',
      shipping: 'green',
      promotion: 'purple',
      account: 'gray',
      review: 'yellow',
      loyalty: 'orange',
      system: 'indigo'
    }
    return colors[type] || 'gray'
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      high: 'danger',
      medium: 'warning',
      low: 'secondary'
    }
    return variants[priority] || 'secondary'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Notification Center</h2>
          <p className="text-neutral-600">Stay updated with your orders and account activity</p>
        </div>
        {stats.unread > 0 && (
          <Badge variant="danger" size="md">
            {stats.unread} unread
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Unread</p>
              <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
            </div>
            <span className="text-2xl">🔴</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Today</p>
              <p className="text-2xl font-bold">{stats.today}</p>
            </div>
            <span className="text-2xl">📅</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">This Week</p>
              <p className="text-2xl font-bold">{stats.thisWeek}</p>
            </div>
            <span className="text-2xl">📆</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'All', count: stats.total },
          { id: 'unread', label: 'Unread', count: stats.unread },
          { id: 'settings', label: 'Settings', count: null }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors
              ${activeTab === tab.id 
                ? 'bg-maroon-700 text-white' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }
            `}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <Badge 
                variant={activeTab === tab.id ? 'secondary' : 'primary'} 
                size="sm"
              >
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {activeTab !== 'settings' && (
        <div className="space-y-4">
          {/* Filters and Actions */}
          <Card>
            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filter:</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-1 border border-neutral-300 rounded-lg text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="order">Orders ({stats.byType.order || 0})</option>
                  <option value="shipping">Shipping ({stats.byType.shipping || 0})</option>
                  <option value="promotion">Promotions ({stats.byType.promotion || 0})</option>
                  <option value="loyalty">Loyalty ({stats.byType.loyalty || 0})</option>
                  <option value="review">Reviews ({stats.byType.review || 0})</option>
                  <option value="account">Account ({stats.byType.account || 0})</option>
                  <option value="system">System ({stats.byType.system || 0})</option>
                </select>
              </div>
              <div className="flex gap-2">
                {stats.unread > 0 && (
                  <Button variant="secondary" size="sm" onClick={markAllAsRead}>
                    Mark All Read
                  </Button>
                )}
                {stats.total > 0 && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setShowClearModal(true)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Notifications */}
          {filteredNotifications.length === 0 ? (
            <Card>
              <div className="p-6">
                <EmptyState
                  icon={
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  }
                  title="No notifications"
                  description={activeTab === 'unread' ? "You're all caught up!" : "Your notifications will appear here"}
                />
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(notification => (
                <Card 
                  key={notification.id}
                  className={`transition-all ${!notification.read ? 'ring-2 ring-maroon-200 bg-maroon-50/20' : ''}`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        bg-${getTypeColor(notification.type)}-100
                      `}>
                        <span className="text-xl">{notification.icon || getTypeIcon(notification.type)}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-semibold ${!notification.read ? 'text-maroon-700' : ''}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={getPriorityBadge(notification.priority)} size="sm">
                              {notification.priority}
                            </Badge>
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-neutral-400 hover:text-red-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-neutral-700 mb-2">{notification.message}</p>
                        
                        {notification.metadata && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {notification.metadata.orderId && (
                              <span className="text-xs bg-neutral-100 px-2 py-1 rounded">
                                Order: {notification.metadata.orderId}
                              </span>
                            )}
                            {notification.metadata.trackingNumber && (
                              <span className="text-xs bg-neutral-100 px-2 py-1 rounded">
                                Tracking: {notification.metadata.trackingNumber}
                              </span>
                            )}
                            {notification.metadata.points && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                +{notification.metadata.points} points
                              </span>
                            )}
                            {notification.metadata.discount && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {notification.metadata.discount}% off
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark as read
                              </Button>
                            )}
                            {notification.actionUrl && (
                              <Link href={notification.actionUrl}>
                                <Button variant="primary" size="sm">
                                  {notification.actionLabel || 'View'}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
              <p className="text-sm text-neutral-600 mb-6">
                Choose which types of notifications you want to receive
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order Updates</p>
                    <p className="text-sm text-neutral-600">Confirmations, shipping, and delivery</p>
                  </div>
                  <Toggle
                    checked={preferences.orders}
                    onChange={(checked) => setPreferences({ ...preferences, orders: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Shipping Notifications</p>
                    <p className="text-sm text-neutral-600">Tracking updates and delivery alerts</p>
                  </div>
                  <Toggle
                    checked={preferences.shipping}
                    onChange={(checked) => setPreferences({ ...preferences, shipping: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Promotions & Offers</p>
                    <p className="text-sm text-neutral-600">Sales, discounts, and exclusive deals</p>
                  </div>
                  <Toggle
                    checked={preferences.promotions}
                    onChange={(checked) => setPreferences({ ...preferences, promotions: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Review Reminders</p>
                    <p className="text-sm text-neutral-600">Product review requests and responses</p>
                  </div>
                  <Toggle
                    checked={preferences.reviews}
                    onChange={(checked) => setPreferences({ ...preferences, reviews: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Loyalty Program</p>
                    <p className="text-sm text-neutral-600">Points earned, rewards, and tier updates</p>
                  </div>
                  <Toggle
                    checked={preferences.loyalty}
                    onChange={(checked) => setPreferences({ ...preferences, loyalty: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">System Updates</p>
                    <p className="text-sm text-neutral-600">New features and important announcements</p>
                  </div>
                  <Toggle
                    checked={preferences.system}
                    onChange={(checked) => setPreferences({ ...preferences, system: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Delivery Methods</h3>
              <p className="text-sm text-neutral-600 mb-6">
                Choose how you want to receive notifications
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-neutral-600">Receive notifications via email</p>
                  </div>
                  <Toggle
                    checked={preferences.emailAlerts}
                    onChange={(checked) => setPreferences({ ...preferences, emailAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-neutral-600">Browser push notifications</p>
                  </div>
                  <Toggle
                    checked={preferences.pushNotifications}
                    onChange={(checked) => setPreferences({ ...preferences, pushNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Alerts</p>
                    <p className="text-sm text-neutral-600">Important updates via SMS</p>
                  </div>
                  <Toggle
                    checked={preferences.smsAlerts}
                    onChange={(checked) => setPreferences({ ...preferences, smsAlerts: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Notification Schedule</h3>
              <p className="text-sm text-neutral-600 mb-6">
                Set quiet hours to avoid notifications during specific times
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quiet Hours Start</label>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Quiet Hours End</label>
                  <input
                    type="time"
                    defaultValue="08:00"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>
              <p className="text-xs text-neutral-600 mt-2">
                During quiet hours, only critical notifications will be delivered
              </p>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={savePreferences}>
              Save Preferences
            </Button>
          </div>
        </div>
      )}

      {/* Clear All Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Notifications"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Are you sure you want to clear all notifications? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowClearModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={clearAllNotifications}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Alert */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert 
            variant="success" 
            className="shadow-lg"
          >
            {toastMessage}
          </Alert>
        </div>
      )}
    </div>
  )
}
