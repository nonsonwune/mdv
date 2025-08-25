"use client"

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Card, Button, Input, Badge, Modal } from '../ui'
import { useToast } from '../../app/_components/ToastProvider'

export interface UserData {
  id: number
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  name?: string
  avatar?: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
  bio?: string
  joinedDate?: string
  createdAt?: string
  verified?: boolean
  loyaltyTier?: string
  totalOrders?: number
  totalSpent?: number
}

interface UserProfileProps {
  user: UserData
  onUpdate?: (userData: UserData) => void
}

export default function UserProfile({ user: initialUser, onUpdate }: UserProfileProps) {
  const [user, setUser] = useState<UserData>(initialUser)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<UserData>>({})
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const startEdit = () => {
    setEditData({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      bio: user.bio
    })
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setEditData({})
    setIsEditing(false)
  }

  const saveProfile = () => {
    const updatedUser = { ...user, ...editData }
    setUser(updatedUser)
    
    // Save to localStorage
    localStorage.setItem('mdv_user_profile', JSON.stringify(updatedUser))
    
    if (onUpdate) {
      onUpdate(updatedUser)
    }
    
    toast.success('Profile updated', 'Your changes have been saved')
    setIsEditing(false)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Please select an image under 5MB')
      return
    }

    setUploadingAvatar(true)
    
    // Create a preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      const avatarUrl = reader.result as string
      const updatedUser = { ...user, avatar: avatarUrl }
      setUser(updatedUser)
      localStorage.setItem('mdv_user_profile', JSON.stringify(updatedUser))
      setUploadingAvatar(false)
      setShowAvatarModal(false)
      toast.success('Avatar updated', 'Your profile picture has been changed')
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    const updatedUser = { ...user, avatar: undefined }
    setUser(updatedUser)
    localStorage.setItem('mdv_user_profile', JSON.stringify(updatedUser))
    setShowAvatarModal(false)
    toast.success('Avatar removed', 'Your profile picture has been removed')
  }

  const getLoyaltyColor = (tier?: string) => {
    switch (tier) {
      case 'bronze': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'silver': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'platinum': return 'text-purple-600 bg-purple-50 border-purple-200'
      default: return 'text-neutral-600 bg-neutral-50 border-neutral-200'
    }
  }

  const getInitials = () => {
    const first = user.firstName?.[0] || user.name?.[0] || 'U'
    const last = user.lastName?.[0] || ''
    return `${first}${last}`.toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Profile'}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-maroon-700 text-white flex items-center justify-center text-2xl font-semibold">
                    {getInitials()}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input
                            value={editData.firstName || ''}
                            onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                            placeholder="First Name"
                            inputSize="sm"
                          />
                          <Input
                            value={editData.lastName || ''}
                            onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                            placeholder="Last Name"
                            inputSize="sm"
                          />
                        </div>
                      ) : (
                        `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'User'
                      )}
                    </h2>
                    {user.verified && (
                      <Badge variant="success" size="sm">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-neutral-600">{user.email}</p>
                  
                  {isEditing ? (
                    <Input
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="Phone Number"
                      className="mt-2"
                      inputSize="sm"
                    />
                  ) : (
                    user.phone && <p className="text-neutral-600">{user.phone}</p>
                  )}
                </div>

                {!isEditing && (
                  <Button size="sm" variant="secondary" onClick={startEdit}>
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Bio */}
              {isEditing ? (
                <textarea
                  value={editData.bio || ''}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="mt-4 w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-maroon-500"
                  rows={3}
                />
              ) : (
                user.bio && (
                  <p className="mt-4 text-sm text-neutral-600">{user.bio}</p>
                )
              )}

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="primary" onClick={saveProfile}>
                    Save Changes
                  </Button>
                  <Button size="sm" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-neutral-600">Member Since</p>
              <p className="font-semibold">
                {user.joinedDate ? new Date(user.joinedDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Orders</p>
              <p className="font-semibold">{user.totalOrders || 0}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Spent</p>
              <p className="font-semibold">₦{(user.totalSpent || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Loyalty Tier</p>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold capitalize border ${getLoyaltyColor(user.loyaltyTier)}`}>
                {user.loyaltyTier || 'Member'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Info */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Date of Birth
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.dateOfBirth || ''}
                  onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                  inputSize="sm"
                />
              ) : (
                <p className="text-neutral-900">
                  {user.dateOfBirth 
                    ? new Date(user.dateOfBirth).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'Not provided'
                  }
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Gender
              </label>
              {isEditing ? (
                <select
                  value={editData.gender || ''}
                  onChange={(e) => setEditData({ ...editData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <p className="text-neutral-900 capitalize">
                  {user.gender || 'Not provided'}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium">Order History</p>
              <p className="text-xs text-neutral-600">View past orders</p>
            </div>
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium">Loyalty Points</p>
              <p className="text-xs text-neutral-600">Check rewards</p>
            </div>
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium">Reviews</p>
              <p className="text-xs text-neutral-600">Your feedback</p>
            </div>
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Avatar Upload Modal */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Change Profile Picture"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt="Current avatar"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-maroon-700 text-white flex items-center justify-center text-3xl font-semibold">
                  {getInitials()}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            
            <Button
              variant="primary"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadingAvatar}
            >
              Upload New Photo
            </Button>
            
            {user.avatar && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={removeAvatar}
              >
                Remove Photo
              </Button>
            )}
          </div>

          <p className="text-xs text-neutral-600 text-center">
            Allowed formats: JPG, PNG. Max size: 5MB
          </p>
        </div>
      </Modal>
    </div>
  )
}
