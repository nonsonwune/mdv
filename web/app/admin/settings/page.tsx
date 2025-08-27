'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import {
  CogIcon,
  TruckIcon,
  TagIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  BellIcon,
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

// Types
interface ShippingZone {
  id: number
  name: string
  countries: string[]
  shipping_methods: ShippingMethod[]
}

interface ShippingMethod {
  id: number
  name: string
  description?: string
  cost: number
  delivery_time: string
  is_active: boolean
}

interface Coupon {
  id: number
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order_amount?: number
  max_discount_amount?: number
  usage_limit?: number
  used_count: number
  expires_at?: string
  is_active: boolean
}

interface AppSettings {
  store_name: string
  store_description?: string
  store_email: string
  store_phone?: string
  store_address?: string
  currency: string
  tax_rate: number
  low_stock_threshold: number
  enable_reviews: boolean
  enable_wishlist: boolean
  maintenance_mode: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
  email_from_name: string
  email_from_address: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'shipping' | 'coupons' | 'notifications'>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Settings data
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])

  // Editing states
  const [editingShippingZone, setEditingShippingZone] = useState<ShippingZone | null>(null)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [showNewShippingZone, setShowNewShippingZone] = useState(false)
  const [showNewCoupon, setShowNewCoupon] = useState(false)

  useEffect(() => {
    fetchAllSettings()
  }, [])

  const fetchAllSettings = async () => {
    try {
      setLoading(true)
      const [settingsRes, shippingRes, couponsRes] = await Promise.all([
        api<AppSettings>('/api/admin/settings'),
        api<ShippingZone[]>('/api/admin/settings/shipping-zones'),
        api<Coupon[]>('/api/admin/settings/coupons')
      ])
      
      setAppSettings(settingsRes)
      setShippingZones(shippingRes)
      setCoupons(couponsRes)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      // Set mock data for development
      setAppSettings({
        store_name: 'My Store',
        store_description: 'Premium clothing and accessories',
        store_email: 'contact@mystore.com',
        store_phone: '+1 (555) 123-4567',
        store_address: '123 Main St, City, State 12345',
        currency: 'USD',
        tax_rate: 8.25,
        low_stock_threshold: 10,
        enable_reviews: true,
        enable_wishlist: true,
        maintenance_mode: false,
        email_from_name: 'My Store',
        email_from_address: 'noreply@mystore.com'
      })
      setShippingZones([
        {
          id: 1,
          name: 'Domestic',
          countries: ['United States'],
          shipping_methods: [
            { id: 1, name: 'Standard Shipping', cost: 5.99, delivery_time: '5-7 business days', is_active: true },
            { id: 2, name: 'Express Shipping', cost: 12.99, delivery_time: '2-3 business days', is_active: true }
          ]
        },
        {
          id: 2,
          name: 'International',
          countries: ['Canada', 'Mexico', 'United Kingdom'],
          shipping_methods: [
            { id: 3, name: 'International Standard', cost: 15.99, delivery_time: '7-14 business days', is_active: true }
          ]
        }
      ])
      setCoupons([
        {
          id: 1,
          code: 'WELCOME10',
          type: 'percentage',
          value: 10,
          min_order_amount: 50,
          usage_limit: 100,
          used_count: 25,
          expires_at: '2024-12-31',
          is_active: true
        },
        {
          id: 2,
          code: 'FREESHIP',
          type: 'fixed',
          value: 5.99,
          min_order_amount: 75,
          used_count: 150,
          is_active: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAppSettings = async () => {
    if (!appSettings) return

    setSaving(true)
    try {
      await api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(appSettings)
      })
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveShippingZone = async (zone: ShippingZone) => {
    try {
      if (zone.id > 1000) { // New zone (temporary ID)
        await api('/api/admin/settings/shipping-zones', {
          method: 'POST',
          body: JSON.stringify(zone)
        })
      } else {
        await api(`/api/admin/settings/shipping-zones/${zone.id}`, {
          method: 'PUT',
          body: JSON.stringify(zone)
        })
      }
      await fetchAllSettings()
      setEditingShippingZone(null)
      setShowNewShippingZone(false)
      alert('Shipping zone saved successfully!')
    } catch (error) {
      console.error('Failed to save shipping zone:', error)
      alert('Failed to save shipping zone.')
    }
  }

  const handleDeleteShippingZone = async (zoneId: number) => {
    if (!confirm('Are you sure you want to delete this shipping zone?')) return

    try {
      await api(`/api/admin/settings/shipping-zones/${zoneId}`, {
        method: 'DELETE'
      })
      setShippingZones(shippingZones.filter(z => z.id !== zoneId))
      alert('Shipping zone deleted successfully!')
    } catch (error) {
      console.error('Failed to delete shipping zone:', error)
      alert('Failed to delete shipping zone.')
    }
  }

  const handleSaveCoupon = async (coupon: Coupon) => {
    try {
      if (coupon.id > 1000) { // New coupon (temporary ID)
        await api('/api/admin/settings/coupons', {
          method: 'POST',
          body: JSON.stringify(coupon)
        })
      } else {
        await api(`/api/admin/settings/coupons/${coupon.id}`, {
          method: 'PUT',
          body: JSON.stringify(coupon)
        })
      }
      await fetchAllSettings()
      setEditingCoupon(null)
      setShowNewCoupon(false)
      alert('Coupon saved successfully!')
    } catch (error) {
      console.error('Failed to save coupon:', error)
      alert('Failed to save coupon.')
    }
  }

  const handleDeleteCoupon = async (couponId: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return

    try {
      await api(`/api/admin/settings/coupons/${couponId}`, {
        method: 'DELETE'
      })
      setCoupons(coupons.filter(c => c.id !== couponId))
      alert('Coupon deleted successfully!')
    } catch (error) {
      console.error('Failed to delete coupon:', error)
      alert('Failed to delete coupon.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your store configuration and preferences</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'general', label: 'General', icon: CogIcon },
              { key: 'shipping', label: 'Shipping', icon: TruckIcon },
              { key: 'coupons', label: 'Coupons', icon: TagIcon },
              { key: 'notifications', label: 'Notifications', icon: BellIcon }
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
      {activeTab === 'general' && appSettings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <BuildingStorefrontIcon className="h-5 w-5" />
                Store Information
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
                <input
                  type="text"
                  value={appSettings.store_name}
                  onChange={(e) => setAppSettings({...appSettings, store_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={appSettings.store_description || ''}
                  onChange={(e) => setAppSettings({...appSettings, store_description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={appSettings.store_email}
                  onChange={(e) => setAppSettings({...appSettings, store_email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={appSettings.store_phone || ''}
                  onChange={(e) => setAppSettings({...appSettings, store_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={appSettings.store_address || ''}
                  onChange={(e) => setAppSettings({...appSettings, store_address: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>
            </div>
          </div>

          {/* Business Settings */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5" />
                Business Settings
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={appSettings.currency}
                  onChange={(e) => setAppSettings({...appSettings, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={appSettings.tax_rate}
                  onChange={(e) => setAppSettings({...appSettings, tax_rate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={appSettings.low_stock_threshold}
                  onChange={(e) => setAppSettings({...appSettings, low_stock_threshold: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
                <p className="text-xs text-gray-500 mt-1">Alert when product stock falls below this number</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Features</h4>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable_reviews"
                    checked={appSettings.enable_reviews}
                    onChange={(e) => setAppSettings({...appSettings, enable_reviews: e.target.checked})}
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable_reviews" className="ml-2 block text-sm text-gray-700">
                    Enable product reviews
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable_wishlist"
                    checked={appSettings.enable_wishlist}
                    onChange={(e) => setAppSettings({...appSettings, enable_wishlist: e.target.checked})}
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable_wishlist" className="ml-2 block text-sm text-gray-700">
                    Enable customer wishlists
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="maintenance_mode"
                    checked={appSettings.maintenance_mode}
                    onChange={(e) => setAppSettings({...appSettings, maintenance_mode: e.target.checked})}
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                  />
                  <label htmlFor="maintenance_mode" className="ml-2 block text-sm text-gray-700">
                    <span className="text-red-600">Maintenance mode</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="lg:col-span-2">
            <div className="flex justify-end">
              <button
                onClick={handleSaveAppSettings}
                disabled={saving}
                className="px-6 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save General Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shipping' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Shipping Zones</h3>
            <button
              onClick={() => setShowNewShippingZone(true)}
              className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Shipping Zone
            </button>
          </div>

          {/* Shipping Zones List */}
          <div className="grid grid-cols-1 gap-4">
            {shippingZones.map(zone => (
              <div key={zone.id} className="bg-white rounded-lg shadow border">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{zone.name}</h4>
                      <p className="text-sm text-gray-500">
                        Countries: {zone.countries.join(', ')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingShippingZone(zone)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteShippingZone(zone.id)}
                        className="p-2 text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Shipping Methods:</h5>
                    {zone.shipping_methods.map(method => (
                      <div key={method.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{method.name}</p>
                          <p className="text-sm text-gray-500">{method.delivery_time}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${method.cost}</p>
                          <span className={`px-2 py-1 text-xs rounded ${
                            method.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {method.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Discount Coupons</h3>
            <button
              onClick={() => setShowNewCoupon(true)}
              className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Create Coupon
            </button>
          </div>

          {/* Coupons List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map(coupon => (
                  <tr key={coupon.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{coupon.code}</div>
                      {coupon.expires_at && (
                        <div className="text-sm text-gray-500">
                          Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {coupon.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.used_count} / {coupon.usage_limit || '∞'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCoupon(coupon)}
                          className="text-maroon-600 hover:text-maroon-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && appSettings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Settings */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <EnvelopeIcon className="h-5 w-5" />
                Email Settings
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                <input
                  type="text"
                  value={appSettings.email_from_name}
                  onChange={(e) => setAppSettings({...appSettings, email_from_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                <input
                  type="email"
                  value={appSettings.email_from_address}
                  onChange={(e) => setAppSettings({...appSettings, email_from_address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                <input
                  type="text"
                  value={appSettings.smtp_host || ''}
                  onChange={(e) => setAppSettings({...appSettings, smtp_host: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                <input
                  type="number"
                  value={appSettings.smtp_port || ''}
                  onChange={(e) => setAppSettings({...appSettings, smtp_port: parseInt(e.target.value) || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                  placeholder="587"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
                <input
                  type="text"
                  value={appSettings.smtp_username || ''}
                  onChange={(e) => setAppSettings({...appSettings, smtp_username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <BellIcon className="h-5 w-5" />
                Notification Preferences
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notify_new_orders"
                    defaultChecked={true}
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notify_new_orders" className="ml-2 block text-sm text-gray-700">
                    New order notifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notify_low_stock"
                    defaultChecked={true}
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notify_low_stock" className="ml-2 block text-sm text-gray-700">
                    Low stock alerts
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notify_reviews"
                    defaultChecked={true}
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notify_reviews" className="ml-2 block text-sm text-gray-700">
                    New product reviews
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notify_customer_messages"
                    defaultChecked={true}
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notify_customer_messages" className="ml-2 block text-sm text-gray-700">
                    Customer support messages
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="lg:col-span-2">
            <div className="flex justify-end">
              <button
                onClick={handleSaveAppSettings}
                disabled={saving}
                className="px-6 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
