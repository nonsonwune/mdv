"use client"

import { useState, useEffect } from 'react'
import { Card, Button, Input, Toggle, Badge, Modal, Toast } from '../ui'
import type { UserData } from './UserProfile'

interface NotificationSettings {
  email: {
    orders: boolean
    promotions: boolean
    newsletter: boolean
    priceAlerts: boolean
    stockAlerts: boolean
  }
  sms: {
    orders: boolean
    shipping: boolean
    promotions: boolean
  }
  push: {
    enabled: boolean
    orders: boolean
    promotions: boolean
    reminders: boolean
  }
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private'
  showWishlist: boolean
  allowReviews: boolean
  dataCollection: boolean
  thirdPartySharing: boolean
  marketingCommunications: boolean
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  loginAlerts: boolean
  trustedDevices: Array<{
    id: string
    name: string
    lastUsed: string
    current: boolean
  }>
  sessions: Array<{
    id: string
    device: string
    location: string
    lastActive: string
    current: boolean
  }>
}

interface PreferencesSettings {
  language: string
  currency: string
  measurementUnit: 'metric' | 'imperial'
  newsletter: 'daily' | 'weekly' | 'monthly' | 'never'
  orderUpdates: 'all' | 'important' | 'none'
  theme: 'light' | 'dark' | 'system'
}

interface AccountSettingsProps {
  user: UserData
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'privacy' | 'security' | 'preferences'>('notifications')
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: {
      orders: true,
      promotions: false,
      newsletter: true,
      priceAlerts: false,
      stockAlerts: true
    },
    sms: {
      orders: true,
      shipping: true,
      promotions: false
    },
    push: {
      enabled: false,
      orders: true,
      promotions: false,
      reminders: true
    }
  })

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'private',
    showWishlist: false,
    allowReviews: true,
    dataCollection: true,
    thirdPartySharing: false,
    marketingCommunications: true
  })

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginAlerts: true,
    trustedDevices: [
      {
        id: '1',
        name: 'MacBook Pro',
        lastUsed: '2024-01-20',
        current: true
      },
      {
        id: '2',
        name: 'iPhone 13',
        lastUsed: '2024-01-19',
        current: false
      }
    ],
    sessions: [
      {
        id: '1',
        device: 'Chrome on MacOS',
        location: 'Lagos, Nigeria',
        lastActive: '2 minutes ago',
        current: true
      },
      {
        id: '2',
        device: 'Safari on iOS',
        location: 'Lagos, Nigeria',
        lastActive: '1 hour ago',
        current: false
      }
    ]
  })

  const [preferences, setPreferences] = useState<PreferencesSettings>({
    language: 'en',
    currency: 'NGN',
    measurementUnit: 'metric',
    newsletter: 'weekly',
    orderUpdates: 'all',
    theme: 'light'
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('mdv_account_settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setNotifications(settings.notifications || notifications)
      setPrivacy(settings.privacy || privacy)
      setSecurity(settings.security || security)
      setPreferences(settings.preferences || preferences)
    }
  }

  const saveSettings = () => {
    setLoading(true)
    setTimeout(() => {
      const settings = {
        notifications,
        privacy,
        security,
        preferences
      }
      localStorage.setItem('mdv_account_settings', JSON.stringify(settings))
      setToastMessage('Settings saved successfully')
      setShowToast(true)
      setLoading(false)
    }, 1000)
  }

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToastMessage('Passwords do not match')
      setShowToast(true)
      return
    }
    
    if (passwordForm.newPassword.length < 8) {
      setToastMessage('Password must be at least 8 characters')
      setShowToast(true)
      return
    }

    setLoading(true)
    setTimeout(() => {
      setShowPasswordModal(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setToastMessage('Password updated successfully')
      setShowToast(true)
      setLoading(false)
    }, 1000)
  }

  const toggle2FA = () => {
    if (!security.twoFactorEnabled) {
      setShow2FAModal(true)
    } else {
      setSecurity({ ...security, twoFactorEnabled: false })
      setToastMessage('Two-factor authentication disabled')
      setShowToast(true)
    }
  }

  const enable2FA = () => {
    setSecurity({ ...security, twoFactorEnabled: true })
    setShow2FAModal(false)
    setToastMessage('Two-factor authentication enabled')
    setShowToast(true)
  }

  const removeDevice = (deviceId: string) => {
    setSecurity({
      ...security,
      trustedDevices: security.trustedDevices.filter(d => d.id !== deviceId)
    })
    setToastMessage('Device removed')
    setShowToast(true)
  }

  const endSession = (sessionId: string) => {
    setSecurity({
      ...security,
      sessions: security.sessions.filter(s => s.id !== sessionId)
    })
    setToastMessage('Session ended')
    setShowToast(true)
  }

  const handleDeleteAccount = () => {
    setLoading(true)
    setTimeout(() => {
      // In a real app, this would delete the account
      localStorage.clear()
      setShowDeleteModal(false)
      setToastMessage('Account deletion requested. You will receive a confirmation email.')
      setShowToast(true)
      setLoading(false)
    }, 2000)
  }

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
        <p className="text-neutral-600">Manage your account preferences and security settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
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
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order Updates</p>
                    <p className="text-sm text-neutral-600">Receive emails about your orders</p>
                  </div>
                  <Toggle
                    checked={notifications.email.orders}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      email: { ...notifications.email, orders: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Promotions & Offers</p>
                    <p className="text-sm text-neutral-600">Get exclusive deals and discounts</p>
                  </div>
                  <Toggle
                    checked={notifications.email.promotions}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      email: { ...notifications.email, promotions: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Newsletter</p>
                    <p className="text-sm text-neutral-600">Weekly fashion trends and updates</p>
                  </div>
                  <Toggle
                    checked={notifications.email.newsletter}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      email: { ...notifications.email, newsletter: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Price Alerts</p>
                    <p className="text-sm text-neutral-600">Notify when saved items go on sale</p>
                  </div>
                  <Toggle
                    checked={notifications.email.priceAlerts}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      email: { ...notifications.email, priceAlerts: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Stock Alerts</p>
                    <p className="text-sm text-neutral-600">Notify when items are back in stock</p>
                  </div>
                  <Toggle
                    checked={notifications.email.stockAlerts}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      email: { ...notifications.email, stockAlerts: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">SMS Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order Confirmations</p>
                    <p className="text-sm text-neutral-600">SMS when orders are placed</p>
                  </div>
                  <Toggle
                    checked={notifications.sms.orders}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      sms: { ...notifications.sms, orders: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Shipping Updates</p>
                    <p className="text-sm text-neutral-600">Track your package via SMS</p>
                  </div>
                  <Toggle
                    checked={notifications.sms.shipping}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      sms: { ...notifications.sms, shipping: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Promotional SMS</p>
                    <p className="text-sm text-neutral-600">Exclusive SMS-only offers</p>
                  </div>
                  <Toggle
                    checked={notifications.sms.promotions}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      sms: { ...notifications.sms, promotions: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Push Notifications</p>
                    <p className="text-sm text-neutral-600">Allow browser notifications</p>
                  </div>
                  <Toggle
                    checked={notifications.push.enabled}
                    onChange={(checked) => setNotifications({
                      ...notifications,
                      push: { ...notifications.push, enabled: checked }
                    })}
                  />
                </div>
                {notifications.push.enabled && (
                  <>
                    <div className="flex items-center justify-between pl-6">
                      <div>
                        <p className="font-medium">Order Updates</p>
                        <p className="text-sm text-neutral-600">Real-time order status</p>
                      </div>
                      <Toggle
                        checked={notifications.push.orders}
                        onChange={(checked) => setNotifications({
                          ...notifications,
                          push: { ...notifications.push, orders: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between pl-6">
                      <div>
                        <p className="font-medium">Flash Sales</p>
                        <p className="text-sm text-neutral-600">Limited-time offers</p>
                      </div>
                      <Toggle
                        checked={notifications.push.promotions}
                        onChange={(checked) => setNotifications({
                          ...notifications,
                          push: { ...notifications.push, promotions: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between pl-6">
                      <div>
                        <p className="font-medium">Cart Reminders</p>
                        <p className="text-sm text-neutral-600">Abandoned cart notifications</p>
                      </div>
                      <Toggle
                        checked={notifications.push.reminders}
                        onChange={(checked) => setNotifications({
                          ...notifications,
                          push: { ...notifications.push, reminders: checked }
                        })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Profile Privacy</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Profile Visibility</label>
                  <select
                    value={privacy.profileVisibility}
                    onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="public">Public - Anyone can view</option>
                    <option value="private">Private - Only you can view</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Wishlist</p>
                    <p className="text-sm text-neutral-600">Allow others to see your wishlist</p>
                  </div>
                  <Toggle
                    checked={privacy.showWishlist}
                    onChange={(checked) => setPrivacy({ ...privacy, showWishlist: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Allow Reviews</p>
                    <p className="text-sm text-neutral-600">Show your product reviews publicly</p>
                  </div>
                  <Toggle
                    checked={privacy.allowReviews}
                    onChange={(checked) => setPrivacy({ ...privacy, allowReviews: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Data & Analytics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Personalized Experience</p>
                    <p className="text-sm text-neutral-600">Use data to improve recommendations</p>
                  </div>
                  <Toggle
                    checked={privacy.dataCollection}
                    onChange={(checked) => setPrivacy({ ...privacy, dataCollection: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Third-Party Sharing</p>
                    <p className="text-sm text-neutral-600">Share data with partners for analytics</p>
                  </div>
                  <Toggle
                    checked={privacy.thirdPartySharing}
                    onChange={(checked) => setPrivacy({ ...privacy, thirdPartySharing: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Communications</p>
                    <p className="text-sm text-neutral-600">Receive personalized marketing</p>
                  </div>
                  <Toggle
                    checked={privacy.marketingCommunications}
                    onChange={(checked) => setPrivacy({ ...privacy, marketingCommunications: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Data Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Download Your Data</p>
                    <p className="text-sm text-neutral-600">Get a copy of all your account data</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Clear Search History</p>
                    <p className="text-sm text-neutral-600">Remove all search history</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Clear
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-600">Delete Account</p>
                    <p className="text-sm text-neutral-600">Permanently delete your account</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Password & Authentication</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-neutral-600">Last changed 30 days ago</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change Password
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-neutral-600">
                      {security.twoFactorEnabled ? 'Enabled' : 'Add an extra layer of security'}
                    </p>
                  </div>
                  <Button 
                    variant={security.twoFactorEnabled ? "outline" : "primary"}
                    size="sm"
                    onClick={toggle2FA}
                  >
                    {security.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Login Alerts</p>
                    <p className="text-sm text-neutral-600">Get notified of new logins</p>
                  </div>
                  <Toggle
                    checked={security.loginAlerts}
                    onChange={(checked) => setSecurity({ ...security, loginAlerts: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Trusted Devices</h3>
              <div className="space-y-3">
                {security.trustedDevices.map(device => (
                  <div key={device.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {device.name}
                        {device.current && (
                          <Badge variant="success" size="sm">Current</Badge>
                        )}
                      </p>
                      <p className="text-sm text-neutral-600">
                        Last used: {new Date(device.lastUsed).toLocaleDateString()}
                      </p>
                    </div>
                    {!device.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDevice(device.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
              <div className="space-y-3">
                {security.sessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {session.device}
                        {session.current && (
                          <Badge variant="success" size="sm">Current</Badge>
                        )}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {session.location} • {session.lastActive}
                      </p>
                    </div>
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => endSession(session.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        End Session
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Regional Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                    <option value="yo">Yoruba</option>
                    <option value="ig">Igbo</option>
                    <option value="ha">Hausa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Currency</label>
                  <select
                    value={preferences.currency}
                    onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="NGN">Nigerian Naira (₦)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GBP">British Pound (£)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Measurement Unit</label>
                  <select
                    value={preferences.measurementUnit}
                    onChange={(e) => setPreferences({ ...preferences, measurementUnit: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="metric">Metric (cm, kg)</option>
                    <option value="imperial">Imperial (in, lbs)</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Communication Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Newsletter Frequency</label>
                  <select
                    value={preferences.newsletter}
                    onChange={(e) => setPreferences({ ...preferences, newsletter: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="never">Never</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Order Updates</label>
                  <select
                    value={preferences.orderUpdates}
                    onChange={(e) => setPreferences({ ...preferences, orderUpdates: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="all">All Updates</option>
                    <option value="important">Important Only</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['light', 'dark', 'system'].map(theme => (
                      <button
                        key={theme}
                        onClick={() => setPreferences({ ...preferences, theme: theme as any })}
                        className={`
                          p-3 rounded-lg border-2 capitalize transition-colors
                          ${preferences.theme === theme
                            ? 'border-maroon-700 bg-maroon-50'
                            : 'border-neutral-300 hover:border-neutral-400'
                          }
                        `}
                      >
                        {theme === 'light' && '☀️'} 
                        {theme === 'dark' && '🌙'} 
                        {theme === 'system' && '💻'} {theme}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          loading={loading}
          className="min-w-[120px]"
        >
          Save Changes
        </Button>
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
      >
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="Enter new password"
            helperText="Minimum 8 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="Confirm new password"
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              loading={loading}
            >
              Update Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        title="Enable Two-Factor Authentication"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Scan this QR code with your authenticator app to enable two-factor authentication.
          </p>
          <div className="flex justify-center p-4 bg-neutral-100 rounded-lg">
            <div className="w-48 h-48 bg-white p-4">
              {/* QR Code placeholder */}
              <div className="w-full h-full bg-neutral-300 rounded flex items-center justify-center">
                <span className="text-xs text-neutral-600">QR Code</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Manual Entry Code</p>
            <code className="block p-3 bg-neutral-100 rounded text-sm">
              MDVS-HOPI-XABC-1234-5678
            </code>
          </div>
          <Input
            label="Verification Code"
            placeholder="Enter 6-digit code"
            maxLength={6}
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShow2FAModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={enable2FA}>
              Enable 2FA
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-sm text-red-700">
              All your data including orders, addresses, and preferences will be permanently deleted.
            </p>
          </div>
          <Input
            label="Type 'DELETE' to confirm"
            placeholder="DELETE"
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteAccount}
              loading={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
