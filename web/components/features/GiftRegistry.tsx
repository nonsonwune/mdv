"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, Button, Badge, Modal, Input, EmptyState } from '../ui'
import { formatNaira } from '../../lib/format'
import type { Product } from '../../lib/types'

interface RegistryItem {
  id: string
  product: Product
  quantity: number
  quantityPurchased: number
  priority: 'high' | 'medium' | 'low'
  notes?: string
  purchasedBy?: Array<{
    name: string
    quantity: number
    date: string
    message?: string
  }>
}

interface Registry {
  id: string
  name: string
  type: 'wedding' | 'birthday' | 'baby-shower' | 'graduation' | 'housewarming' | 'other'
  eventDate: string
  description?: string
  coverImage?: string
  isPublic: boolean
  shareCode: string
  createdAt: string
  items: RegistryItem[]
  coOwners?: string[]
  shippingAddress?: {
    name: string
    address: string
    city: string
    state: string
    zip: string
    phone: string
  }
}

export default function GiftRegistry() {
  const [registries, setRegistries] = useState<Registry[]>([])
  const [activeRegistry, setActiveRegistry] = useState<Registry | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [searchCode, setSearchCode] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'my-registries' | 'find-registry' | 'purchased'>('my-registries')

  useEffect(() => {
    loadRegistries()
  }, [])

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const loadRegistries = () => {
    const saved = localStorage.getItem('mdv_registries')
    if (saved) {
      setRegistries(JSON.parse(saved))
    } else {
      // Mock data
      const mockRegistry: Registry = {
        id: '1',
        name: 'Sarah & John\'s Wedding',
        type: 'wedding',
        eventDate: '2024-06-15',
        description: 'We\'re getting married! Help us start our new life together.',
        coverImage: '/api/placeholder/800/400',
        isPublic: true,
        shareCode: 'SJ2024WED',
        createdAt: '2024-01-01',
        items: [
          {
            id: '1',
            product: {
              id: 1,
              slug: 'luxury-bedding',
              title: 'Luxury Bedding Set',
              description: 'Premium cotton bedding',
              images: [{ id: 1, url: '/api/placeholder/200/200', alt_text: 'Bedding' }],
              variants: [{ id: 1, sku: 'LBS-001', price: 85000, size: 'Queen' }]
            },
            quantity: 1,
            quantityPurchased: 0,
            priority: 'high',
            notes: 'Queen size preferred'
          },
          {
            id: '2',
            product: {
              id: 2,
              slug: 'dinnerware-set',
              title: 'Dinnerware Set',
              description: '12-piece ceramic set',
              images: [{ id: 2, url: '/api/placeholder/200/200', alt_text: 'Dinnerware' }],
              variants: [{ id: 2, sku: 'DWS-001', price: 45000 }]
            },
            quantity: 2,
            quantityPurchased: 1,
            priority: 'medium',
            purchasedBy: [
              {
                name: 'Uncle Ben',
                quantity: 1,
                date: '2024-01-10',
                message: 'Congratulations!'
              }
            ]
          }
        ],
        shippingAddress: {
          name: 'Sarah & John',
          address: '123 Wedding Lane',
          city: 'Lagos',
          state: 'Lagos',
          zip: '100001',
          phone: '08012345678'
        }
      }
      setRegistries([mockRegistry])
    }
  }

  const saveRegistries = (updated: Registry[]) => {
    setRegistries(updated)
    localStorage.setItem('mdv_registries', JSON.stringify(updated))
  }

  const createRegistry = (data: Partial<Registry>) => {
    const newRegistry: Registry = {
      id: Date.now().toString(),
      name: data.name || '',
      type: data.type || 'other',
      eventDate: data.eventDate || '',
      description: data.description,
      coverImage: data.coverImage,
      isPublic: data.isPublic || true,
      shareCode: generateShareCode(),
      createdAt: new Date().toISOString(),
      items: [],
      shippingAddress: data.shippingAddress
    }
    
    const updated = [...registries, newRegistry]
    saveRegistries(updated)
    setActiveRegistry(newRegistry)
    setShowCreateModal(false)
    setToastMessage('Registry created successfully!')
    setShowToast(true)
  }

  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  const addItemToRegistry = (product: Product, quantity: number, priority: string, notes?: string) => {
    if (!activeRegistry) return

    const newItem: RegistryItem = {
      id: Date.now().toString(),
      product,
      quantity,
      quantityPurchased: 0,
      priority: priority as any,
      notes
    }

    const updated = registries.map(reg => 
      reg.id === activeRegistry.id 
        ? { ...reg, items: [...reg.items, newItem] }
        : reg
    )
    
    saveRegistries(updated)
    setActiveRegistry({ ...activeRegistry, items: [...activeRegistry.items, newItem] })
    setShowAddItemModal(false)
    setToastMessage('Item added to registry!')
    setShowToast(true)
  }

  const removeItemFromRegistry = (itemId: string) => {
    if (!activeRegistry) return

    const updated = registries.map(reg => 
      reg.id === activeRegistry.id 
        ? { ...reg, items: reg.items.filter(item => item.id !== itemId) }
        : reg
    )
    
    saveRegistries(updated)
    setActiveRegistry({ 
      ...activeRegistry, 
      items: activeRegistry.items.filter(item => item.id !== itemId) 
    })
    setToastMessage('Item removed from registry')
    setShowToast(true)
  }

  const markAsPurchased = (registryId: string, itemId: string, purchaserName: string, quantity: number, message?: string) => {
    const updated = registries.map(reg => {
      if (reg.id === registryId) {
        return {
          ...reg,
          items: reg.items.map(item => {
            if (item.id === itemId) {
              const purchase = {
                name: purchaserName,
                quantity,
                date: new Date().toISOString(),
                message
              }
              return {
                ...item,
                quantityPurchased: item.quantityPurchased + quantity,
                purchasedBy: [...(item.purchasedBy || []), purchase]
              }
            }
            return item
          })
        }
      }
      return reg
    })
    
    saveRegistries(updated)
    setToastMessage('Thank you for your gift!')
    setShowToast(true)
  }

  const findRegistryByCode = () => {
    const found = registries.find(reg => reg.shareCode === searchCode.toUpperCase())
    if (found) {
      setActiveRegistry(found)
      setToastMessage('Registry found!')
      setShowToast(true)
    } else {
      setToastMessage('Registry not found. Please check the code.')
      setShowToast(true)
    }
  }

  const getRegistryProgress = (registry: Registry) => {
    const totalItems = registry.items.reduce((sum, item) => sum + item.quantity, 0)
    const purchasedItems = registry.items.reduce((sum, item) => sum + item.quantityPurchased, 0)
    return totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      wedding: '💒',
      birthday: '🎂',
      'baby-shower': '👶',
      graduation: '🎓',
      housewarming: '🏠',
      other: '🎁'
    }
    return icons[type] || '🎁'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'danger'
      case 'medium': return 'warning'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gift Registry</h1>
        <p className="text-neutral-600">Create and manage gift registries for your special occasions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'my-registries', label: 'My Registries', icon: '📝' },
          { id: 'find-registry', label: 'Find Registry', icon: '🔍' },
          { id: 'purchased', label: 'Gifts Given', icon: '🎁' }
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
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* My Registries Tab */}
      {activeTab === 'my-registries' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateModal(true)}>
              Create New Registry
            </Button>
          </div>

          {registries.length === 0 ? (
            <EmptyState
              icon="🎁"
              title="No registries yet"
              description="Create your first gift registry for your special occasion"
              action={
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Registry
                </Button>
              }
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registries.map(registry => (
                <Card key={registry.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {registry.coverImage && (
                    <div className="relative h-48 bg-neutral-100">
                      <Image
                        src={registry.coverImage}
                        alt={registry.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="primary">
                          {getTypeIcon(registry.type)} {registry.type}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{registry.name}</h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      Event Date: {new Date(registry.eventDate).toLocaleDateString()}
                    </p>
                    
                    {registry.description && (
                      <p className="text-sm text-neutral-700 mb-3 line-clamp-2">
                        {registry.description}
                      </p>
                    )}
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{registry.items.length} items</span>
                        <span>{getRegistryProgress(registry).toFixed(0)}% complete</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${getRegistryProgress(registry)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setActiveRegistry(registry)}
                      >
                        View Registry
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setActiveRegistry(registry)
                          setShowShareModal(true)
                        }}
                      >
                        Share
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Find Registry Tab */}
      {activeTab === 'find-registry' && (
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Find a Registry</h3>
            <p className="text-sm text-neutral-600 mb-6">
              Enter the registry code shared by the registry owner
            </p>
            
            <div className="flex gap-3">
              <Input
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Enter registry code (e.g., SJ2024WED)"
                className="flex-1"
              />
              <Button onClick={findRegistryByCode}>
                Search
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Registry codes are usually 8 characters long and can be found 
                on the invitation or shared by the registry owner.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Registry Details Modal/View */}
      {activeRegistry && (
        <Modal
          isOpen={!!activeRegistry}
          onClose={() => setActiveRegistry(null)}
          title={activeRegistry.name}
          size="xl"
        >
          <div className="space-y-6">
            {/* Registry Info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="primary">
                    {getTypeIcon(activeRegistry.type)} {activeRegistry.type}
                  </Badge>
                  <Badge variant="secondary">
                    Code: {activeRegistry.shareCode}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-600">
                  Event Date: {new Date(activeRegistry.eventDate).toLocaleDateString()}
                </p>
                {activeRegistry.description && (
                  <p className="text-sm text-neutral-700 mt-2">
                    {activeRegistry.description}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddItemModal(true)}
              >
                Add Item
              </Button>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Registry Progress</span>
                <span>{getRegistryProgress(activeRegistry).toFixed(0)}% complete</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${getRegistryProgress(activeRegistry)}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <h4 className="font-semibold">Registry Items</h4>
              {activeRegistry.items.length === 0 ? (
                <EmptyState
                  icon="🛍️"
                  title="No items yet"
                  description="Add items to your registry"
                  size="sm"
                />
              ) : (
                <div className="space-y-3">
                  {activeRegistry.items.map(item => (
                    <Card key={item.id} className="p-4">
                      <div className="flex gap-4">
                        {item.product.images?.[0] && (
                          <Image
                            src={item.product.images[0].url}
                            alt={item.product.title}
                            width={80}
                            height={80}
                            className="rounded object-cover"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium">{item.product.title}</h5>
                              <p className="text-sm text-neutral-600">
                                {formatNaira(item.product.variants?.[0]?.price || 0)}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getPriorityColor(item.priority)} size="sm">
                                  {item.priority} priority
                                </Badge>
                                <span className="text-sm text-neutral-600">
                                  Qty: {item.quantityPurchased}/{item.quantity}
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-xs text-neutral-500 mt-1">
                                  Note: {item.notes}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              {item.quantityPurchased < item.quantity && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    const name = prompt('Your name:')
                                    const message = prompt('Gift message (optional):')
                                    if (name) {
                                      markAsPurchased(activeRegistry.id, item.id, name, 1, message || undefined)
                                    }
                                  }}
                                >
                                  Mark as Purchased
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItemFromRegistry(item.id)}
                                className="text-red-600"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          
                          {item.purchasedBy && item.purchasedBy.length > 0 && (
                            <div className="mt-3 p-2 bg-green-50 rounded">
                              <p className="text-xs font-medium text-green-800 mb-1">Purchased by:</p>
                              {item.purchasedBy.map((purchase, idx) => (
                                <p key={idx} className="text-xs text-green-700">
                                  {purchase.name} ({purchase.quantity}) 
                                  {purchase.message && ` - "${purchase.message}"`}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping Address */}
            {activeRegistry.shippingAddress && (
              <div>
                <h4 className="font-semibold mb-3">Shipping Address</h4>
                <Card className="p-4 bg-neutral-50">
                  <p className="font-medium">{activeRegistry.shippingAddress.name}</p>
                  <p className="text-sm text-neutral-600">
                    {activeRegistry.shippingAddress.address}<br />
                    {activeRegistry.shippingAddress.city}, {activeRegistry.shippingAddress.state} {activeRegistry.shippingAddress.zip}<br />
                    Phone: {activeRegistry.shippingAddress.phone}
                  </p>
                </Card>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Registry Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Gift Registry"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            createRegistry({
              name: formData.get('name') as string,
              type: formData.get('type') as any,
              eventDate: formData.get('eventDate') as string,
              description: formData.get('description') as string,
              isPublic: formData.get('isPublic') === 'on'
            })
          }}
          className="space-y-4"
        >
          <Input
            name="name"
            label="Registry Name"
            placeholder="e.g., Sarah & John's Wedding"
            required
          />
          
          <div>
            <label className="block text-sm font-medium mb-2">Event Type</label>
            <select name="type" className="w-full px-3 py-2 border border-neutral-300 rounded-lg" required>
              <option value="wedding">Wedding</option>
              <option value="birthday">Birthday</option>
              <option value="baby-shower">Baby Shower</option>
              <option value="graduation">Graduation</option>
              <option value="housewarming">Housewarming</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <Input
            name="eventDate"
            label="Event Date"
            type="date"
            required
          />
          
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              name="description"
              placeholder="Tell your guests about your special day..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
            />
          </div>
          
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isPublic" defaultChecked />
            <span className="text-sm">Make registry public (searchable by code)</span>
          </label>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Registry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Registry"
      >
        {activeRegistry && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-neutral-600 mb-3">
                Share this code with your friends and family
              </p>
              <div className="bg-neutral-100 rounded-lg p-4">
                <p className="text-2xl font-bold tracking-wider text-maroon-700">
                  {activeRegistry.shareCode}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(activeRegistry.shareCode)
                  setToastMessage('Code copied to clipboard!')
                  setShowToast(true)
                }}
              >
                Copy Code
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const url = `${window.location.origin}/registry/${activeRegistry.shareCode}`
                  navigator.clipboard.writeText(url)
                  setToastMessage('Link copied to clipboard!')
                  setShowToast(true)
                }}
              >
                Copy Link
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 animate-pulse">
          <p className="text-sm">{toastMessage}</p>
        </div>
      )}
    </div>
  )
}
