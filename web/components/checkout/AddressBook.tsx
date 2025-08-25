"use client"

import { useState, useEffect } from 'react'
import { Card, Button, Input, Modal, Badge } from '../ui'

export interface Address {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault?: boolean
}

interface AddressBookProps {
  onSelectAddress: (address: Address) => void
  selectedAddressId?: string
}

export default function AddressBook({ onSelectAddress, selectedAddressId }: AddressBookProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [formData, setFormData] = useState<Partial<Address>>({
    country: 'Nigeria'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Nigerian states
  const nigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
    'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
  ]

  useEffect(() => {
    // Load addresses from localStorage
    const saved = localStorage.getItem('mdv_addresses')
    if (saved) {
      setAddresses(JSON.parse(saved))
    } else {
      // Set default addresses for demo
      const defaultAddresses: Address[] = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+234 813 651 4087',
          address1: '123 Victoria Island',
          city: 'Lagos',
          state: 'Lagos',
          postalCode: '101001',
          country: 'Nigeria',
          isDefault: true
        }
      ]
      setAddresses(defaultAddresses)
      localStorage.setItem('mdv_addresses', JSON.stringify(defaultAddresses))
    }
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName) newErrors.firstName = 'First name is required'
    if (!formData.lastName) newErrors.lastName = 'Last name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.phone) newErrors.phone = 'Phone number is required'
    if (!formData.address1) newErrors.address1 = 'Address is required'
    if (!formData.city) newErrors.city = 'City is required'
    if (!formData.state) newErrors.state = 'State is required'
    if (!formData.postalCode) newErrors.postalCode = 'Postal code is required'
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }
    
    // Phone validation
    if (formData.phone && !/^\+?234\s?\d{3}\s?\d{3}\s?\d{4}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Nigerian phone number'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveAddress = () => {
    if (!validateForm()) return
    
    const newAddress: Address = {
      id: editingAddress?.id || Date.now().toString(),
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      email: formData.email!,
      phone: formData.phone!,
      address1: formData.address1!,
      address2: formData.address2,
      city: formData.city!,
      state: formData.state!,
      postalCode: formData.postalCode!,
      country: formData.country || 'Nigeria',
      isDefault: formData.isDefault || addresses.length === 0
    }
    
    let updatedAddresses: Address[]
    
    if (editingAddress) {
      updatedAddresses = addresses.map(addr => 
        addr.id === editingAddress.id ? newAddress : addr
      )
    } else {
      // If setting as default, remove default from others
      if (newAddress.isDefault) {
        updatedAddresses = addresses.map(addr => ({ ...addr, isDefault: false }))
      } else {
        updatedAddresses = [...addresses]
      }
      updatedAddresses.push(newAddress)
    }
    
    setAddresses(updatedAddresses)
    localStorage.setItem('mdv_addresses', JSON.stringify(updatedAddresses))
    
    // Reset form
    setFormData({ country: 'Nigeria' })
    setEditingAddress(null)
    setShowAddModal(false)
    setErrors({})
  }

  const handleDeleteAddress = (id: string) => {
    const updatedAddresses = addresses.filter(addr => addr.id !== id)
    
    // If deleted address was default, set first address as default
    if (addresses.find(a => a.id === id)?.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true
    }
    
    setAddresses(updatedAddresses)
    localStorage.setItem('mdv_addresses', JSON.stringify(updatedAddresses))
  }

  const handleSetDefault = (id: string) => {
    const updatedAddresses = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    }))
    setAddresses(updatedAddresses)
    localStorage.setItem('mdv_addresses', JSON.stringify(updatedAddresses))
  }

  const openEditModal = (address: Address) => {
    setEditingAddress(address)
    setFormData(address)
    setShowAddModal(true)
  }

  const openAddModal = () => {
    setEditingAddress(null)
    setFormData({ country: 'Nigeria' })
    setShowAddModal(false)
    setErrors({})
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shipping Address</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowAddModal(true)}>
          Add New Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-neutral-600 mb-4">No addresses saved yet</p>
          <Button onClick={() => setShowAddModal(true)}>Add Your First Address</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`relative cursor-pointer transition-all ${
                selectedAddressId === address.id 
                  ? 'ring-2 ring-maroon-700 bg-maroon-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => onSelectAddress(address)}
            >
              <div className="p-4">
                {address.isDefault && (
                  <Badge variant="primary" size="sm" className="absolute top-2 right-2">
                    Default
                  </Badge>
                )}
                
                <div className="pr-16">
                  <p className="font-medium">
                    {address.firstName} {address.lastName}
                  </p>
                  <p className="text-sm text-neutral-600 mt-1">
                    {address.address1}
                    {address.address2 && <>, {address.address2}</>}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p className="text-sm text-neutral-600">{address.country}</p>
                  <p className="text-sm text-neutral-600 mt-2">
                    {address.phone}
                  </p>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(address)
                    }}
                    className="text-sm text-maroon-700 hover:text-maroon-800"
                  >
                    Edit
                  </button>
                  {!address.isDefault && (
                    <>
                      <span className="text-neutral-300">|</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSetDefault(address.id)
                        }}
                        className="text-sm text-neutral-600 hover:text-neutral-700"
                      >
                        Set as default
                      </button>
                    </>
                  )}
                  <span className="text-neutral-300">|</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Are you sure you want to delete this address?')) {
                        handleDeleteAddress(address.id)
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Address Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingAddress(null)
          setFormData({ country: 'Nigeria' })
          setErrors({})
        }}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
        size="lg"
      >
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              error={errors.firstName}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName || ''}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              error={errors.lastName}
              required
            />
          </div>
          
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />
          
          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+234 XXX XXX XXXX"
            error={errors.phone}
            required
          />
          
          <Input
            label="Address Line 1"
            value={formData.address1 || ''}
            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
            error={errors.address1}
            required
          />
          
          <Input
            label="Address Line 2 (Optional)"
            value={formData.address2 || ''}
            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              error={errors.city}
              required
            />
            
            <div>
              <label className="block text-sm font-medium mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-maroon-700 ${
                  errors.state ? 'border-red-500' : 'border-neutral-300'
                }`}
              >
                <option value="">Select State</option>
                {nigerianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-xs text-red-500">{errors.state}</p>
              )}
            </div>
          </div>
          
          <Input
            label="Postal Code"
            value={formData.postalCode || ''}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            error={errors.postalCode}
            required
          />
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="setDefault"
              checked={formData.isDefault || false}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="rounded border-neutral-300 text-maroon-700 focus:ring-maroon-700"
            />
            <label htmlFor="setDefault" className="text-sm">
              Set as default address
            </label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="primary"
              onClick={handleSaveAddress}
              className="flex-1"
            >
              {editingAddress ? 'Update Address' : 'Save Address'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false)
                setEditingAddress(null)
                setFormData({ country: 'Nigeria' })
                setErrors({})
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
