'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useAuth, Permission } from '@/lib/auth-context'
import { PermissionGuard, RoleGuard } from '@/components/auth/permission-guards'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UsersIcon,
  KeyIcon,
  ClockIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CogIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  TagIcon,
  LockClosedIcon,
  LockOpenIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface StaffUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'supervisor' | 'operations' | 'logistics'
  is_active: boolean
  is_verified: boolean
  last_login: string | null
  created_at: string
  permissions: string[]
}

// Legacy User interface for backward compatibility
interface User {
  id: number
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
  phone?: string
}

// Enhanced role configuration
const ROLE_CONFIG = {
  admin: {
    label: 'Administrator',
    color: 'bg-red-100 text-red-800',
    icon: ShieldCheckIcon,
    description: 'Full system access and management',
    permissions: ['ALL']
  },
  supervisor: {
    label: 'Supervisor',
    color: 'bg-purple-100 text-purple-800',
    icon: UserGroupIcon,
    description: 'Manage operations and oversee staff',
    permissions: ['MANAGE_USERS', 'VIEW_REPORTS', 'MANAGE_ORDERS']
  },
  operations: {
    label: 'Operations',
    color: 'bg-blue-100 text-blue-800',
    icon: CogIcon,
    description: 'Handle orders, products, and inventory',
    permissions: ['MANAGE_ORDERS', 'MANAGE_PRODUCTS', 'MANAGE_INVENTORY']
  },
  logistics: {
    label: 'Logistics',
    color: 'bg-green-100 text-green-800',
    icon: BuildingOfficeIcon,
    description: 'Manage shipping and fulfillment',
    permissions: ['VIEW_ORDERS', 'MANAGE_SHIPPING']
  }
}

// Status configuration
const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon
  },
  inactive: {
    label: 'Inactive',
    color: 'bg-gray-100 text-gray-800',
    icon: ClockIcon
  },
  suspended: {
    label: 'Suspended',
    color: 'bg-red-100 text-red-800',
    icon: XCircleIcon
  }
}

interface UserStats {
  total_users: number
  active_users: number
  inactive_users: number
  by_role: {
    admin?: number
    supervisor?: number
    operations?: number
    logistics?: number
  }
  recent_users: number
}

const roleColors: Record<string, string> = {
  'admin': 'bg-red-100 text-red-800',
  'supervisor': 'bg-purple-100 text-purple-800',
  'operations': 'bg-blue-100 text-blue-800',
  'logistics': 'bg-green-100 text-green-800'
}

// User type definitions for enhanced interface
type UserType = 'customer' | 'staff'
type StaffRole = 'admin' | 'supervisor' | 'operations' | 'logistics'

// Main user management content component
function UserManagementContent() {
  const { user: currentUser, hasPermission } = useAuth()
  const router = useRouter()

  // Permission checks
  const canManageUsers = hasPermission(Permission.MANAGE_USERS)
  const canViewUsers = hasPermission(Permission.VIEW_USERS) || hasPermission(Permission.MANAGE_USERS)
  const canDeleteUsers = hasPermission(Permission.DELETE_USERS) || hasPermission(Permission.MANAGE_USERS)
  const canManageSupervisors = currentUser?.role === 'admin' // Only admins can manage supervisors
  const isCurrentUserSupervisor = currentUser?.role === 'supervisor'

  // Enhanced state for Customer/Staff sections
  const [activeSection, setActiveSection] = useState<UserType>('staff')
  const [activeStaffTab, setActiveStaffTab] = useState<StaffRole | 'all'>('all')

  // Helper functions for role-based restrictions
  const canEditUser = (user: User) => {
    if (!canManageUsers) return false
    if (isCurrentUserSupervisor && ['admin', 'supervisor'].includes(user.role)) return false
    return true
  }

  const canDeleteUser = (user: User) => {
    if (!canDeleteUsers) return false
    if (isCurrentUserSupervisor && ['admin', 'supervisor'].includes(user.role)) return false
    return true
  }

  const canResetPassword = (user: User) => {
    if (!canManageUsers) return false
    if (isCurrentUserSupervisor && ['admin', 'supervisor'].includes(user.role)) return false
    return true
  }

  // Helper functions for user categorization
  const isCustomerUser = (user: User): boolean => {
    // Customer users have the 'customer' role
    // Fallback: during migration period, operations users with password are likely customers
    if (user.role === 'customer') {
      return true
    }
    // Temporary fallback logic for migration period
    return user.role === 'operations' && user.has_password === true
  }

  const isStaffUser = (user: User): boolean => {
    // Staff users have admin roles
    if (['admin', 'supervisor', 'logistics'].includes(user.role)) {
      return true
    }
    // Operations users without password are likely staff (admin-created)
    return user.role === 'operations' && user.has_password === false
  }

  const getFilteredUsers = (): User[] => {
    let filteredUsers = users

    // Filter by section (customer vs staff)
    if (activeSection === 'customer') {
      filteredUsers = filteredUsers.filter(isCustomerUser)
    } else {
      filteredUsers = filteredUsers.filter(isStaffUser)

      // Further filter by staff role if not 'all'
      if (activeStaffTab !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === activeStaffTab)
      }
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filteredUsers = filteredUsers.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => {
        if (statusFilter === 'active') return user.active
        if (statusFilter === 'inactive') return !user.active
        return true
      })
    }

    return filteredUsers
  }
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [emailError, setEmailError] = useState<string>('')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operations',
    active: true
  })

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (roleFilter !== 'all') {
        params.append('role', roleFilter)
      }
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await api<any>(`/api/admin/users?${params}`)
      // Handle paginated response
      if (response?.items && Array.isArray(response.items)) {
        setUsers(response.items)
        setTotalPages(Math.ceil(response.total / response.per_page) || 1)
      } else if (Array.isArray(response)) {
        // Fallback for direct array response
        setUsers(response)
      } else {
        setUsers([])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setShowCreateModal(false)
      resetForm()
      fetchUsers()
    } catch (error: any) {
      console.error('Failed to create user:', error)
      let detail = ''
      try {
        const data = JSON.parse(error.message)
        detail = data?.detail || ''
      } catch {}
      if (detail.includes('Email already registered')) {
        if (detail.includes('active')) {
          setEmailError('This email is already registered as an active user')
        } else if (detail.includes('operations')) {
          setEmailError('This email belongs to a customer account and will be converted to staff')
        } else {
          setEmailError('This email is already registered')
        }
      } else if (detail.includes('Password is required when converting')) {
        setEmailError('Password is required when converting customer to staff account')
      } else if (detail.includes('already registered as')) {
        setEmailError(detail)
      } else {
        alert('Failed to create user: ' + (detail || 'Unknown error'))
      }
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      await api(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          active: formData.active
        })
      })
      setEditingUser(null)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('Failed to update user')
    }
  }

  const handleDeleteUser = async (user: User) => {
    const confirmMessage = `Delete user: ${user.name}?\n\nThis will:\n• Deactivate their account\n• Prevent them from logging in\n• Preserve their order history\n\nThis action can be reversed by reactivating the user.`

    if (!confirm(confirmMessage)) return

    try {
      await api(`/api/admin/users/${user.id}`, {
        method: 'DELETE'
      })

      alert(`User ${user.name} has been successfully deactivated.`)
      fetchUsers()
    } catch (error: any) {
      console.error('Failed to delete user:', error)

      // Handle specific error cases
      let errorMessage = 'Failed to delete user'
      if (error?.message?.includes('409')) {
        // Business rule violation
        const detail = error.message.split('detail":"')[1]?.split('"')[0] || 'User has active orders'
        errorMessage = `Cannot delete user: ${detail}\n\nWould you like to force delete anyway?`

        if (confirm(errorMessage)) {
          // Retry with force=true
          try {
            await api(`/api/admin/users/${user.id}?force=true`, {
              method: 'DELETE'
            })
            alert(`User ${user.name} has been forcefully deactivated.`)
            fetchUsers()
          } catch (forceError) {
            console.error('Failed to force delete user:', forceError)
            alert('Failed to force delete user. Please try again.')
          }
        }
      } else if (error?.message?.includes('400')) {
        if (error.message.includes('already inactive')) {
          errorMessage = 'User is already inactive'
        } else if (error.message.includes('own account')) {
          errorMessage = 'You cannot delete your own account'
        }
        alert(errorMessage)
      } else {
        alert('Failed to delete user. Please try again.')
      }
    }
  }

  const handleResetPassword = async (user: User) => {
    const confirmMessage = `Reset password for ${user.name}?\n\nThis will:\n• Set their password to "password123"\n• Force them to change it on next login\n• Log this action for audit purposes`

    if (!confirm(confirmMessage)) return

    try {
      const response = await api(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST'
      })

      alert(`Password reset successfully!\n\nUser: ${response.user_name}\nEmail: ${response.user_email}\nTemporary Password: ${response.temporary_password}\n\nThe user must change this password on their next login.`)

      // Refresh users list to show any status changes
      fetchUsers()
    } catch (error) {
      console.error('Failed to reset password:', error)
      alert('Failed to reset password. Please try again.')
    }
  }

  const toggleUserStatus = async (user: User) => {
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          active: !user.active
        })
      })
      fetchUsers()
    } catch (error) {
      console.error('Failed to update user status:', error)
      alert('Failed to update user status')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers()
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'operations',
      active: true
    })
    setEmailError('')
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700"></div>
      </div>
    )
  }

  async function fetchStats() {
    try {
      const response = await api<UserStats>('/api/admin/users/stats')
      setStats(response)
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  // Handle bulk actions
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedUsers.length === 0) {
      alert('Please select users to update')
      return
    }

    try {
      await Promise.all(
        selectedUsers.map(userId => 
          api(`/api/admin/users/${userId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
          })
        )
      )
      setSelectedUsers([])
      fetchUsers()
      fetchStats()
    } catch (error) {
      console.error('Failed to bulk update users:', error)
      alert('Failed to update users')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">
              {activeSection === 'customer'
                ? 'Manage customer accounts and access'
                : activeStaffTab === 'all'
                  ? 'Manage staff accounts, roles, and permissions'
                  : `Manage ${ROLE_CONFIG[activeStaffTab as keyof typeof ROLE_CONFIG]?.label || activeStaffTab} staff members`
              }
              {currentUser?.role === 'supervisor' && (
                <span className="text-amber-600 ml-2">
                  (Limited Access - Cannot manage Admin/Supervisor accounts)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Export Users */}
            <PermissionGuard permission={Permission.MANAGE_USERS}>
              <button
                onClick={() => {/* handleExportUsers() */}}
                className="flex items-center gap-2 px-4 py-2 border border-maroon-300 text-maroon-700 rounded-lg hover:bg-maroon-50 transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Export Users
              </button>
            </PermissionGuard>
            
            {/* Add User */}
            <PermissionGuard permission={Permission.MANAGE_USERS}>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Add User
              </button>
            </PermissionGuard>
          </div>
        </div>
        
        {/* Role-specific notices */}
        {currentUser?.role === 'supervisor' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                <strong>Supervisor Role:</strong> You can view and manage operations/logistics staff, but cannot create admin accounts or modify admin permissions.
              </p>
            </div>
          </div>
        )}
        
        {!canManageUsers && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <ShieldExclamationIcon className="h-5 w-5 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                <strong>Limited Access:</strong> You can only view user information. Contact an administrator to make changes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-50">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_users}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active_users}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-50">
                <ShieldCheckIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Administrators</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.by_role?.admin || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-purple-50">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Recent Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recent_users}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer/Staff Section Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="User sections">
            <button
              onClick={() => setActiveSection('customer')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'customer'
                  ? 'border-maroon-500 text-maroon-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Customer Users
                <span className="bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {users.filter(isCustomerUser).length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('staff')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'staff'
                  ? 'border-maroon-500 text-maroon-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5" />
                Staff Users
                <span className="bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {users.filter(isStaffUser).length}
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* Staff Role Tabs - Only show when Staff section is active */}
        {activeSection === 'staff' && (
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex space-x-6 px-6" aria-label="Staff roles">
              <button
                onClick={() => setActiveStaffTab('all')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeStaffTab === 'all'
                    ? 'border-maroon-500 text-maroon-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Staff ({users.filter(isStaffUser).length})
              </button>
              <button
                onClick={() => setActiveStaffTab('admin')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeStaffTab === 'admin'
                    ? 'border-maroon-500 text-maroon-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4" />
                  Admin ({users.filter(u => u.role === 'admin').length})
                </div>
              </button>
              <button
                onClick={() => setActiveStaffTab('supervisor')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeStaffTab === 'supervisor'
                    ? 'border-maroon-500 text-maroon-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-4 w-4" />
                  Supervisor ({users.filter(u => u.role === 'supervisor').length})
                </div>
              </button>
              <button
                onClick={() => setActiveStaffTab('operations')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeStaffTab === 'operations'
                    ? 'border-maroon-500 text-maroon-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CogIcon className="h-4 w-4" />
                  Operations ({users.filter(u => u.role === 'operations').length})
                </div>
              </button>
              <button
                onClick={() => setActiveStaffTab('logistics')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeStaffTab === 'logistics'
                    ? 'border-maroon-500 text-maroon-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  Logistics ({users.filter(u => u.role === 'logistics').length})
                </div>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              />
            </div>
            {/* Status Filter - Only show for staff users */}
            {activeSection === 'staff' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredUsers().length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {activeSection === 'customer'
                      ? 'No customer users found'
                      : activeStaffTab === 'all'
                        ? 'No staff users found'
                        : `No ${activeStaffTab} users found`
                    }
                  </td>
                </tr>
              ) : (
                getFilteredUsers().map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          user.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.active ? (
                          <>
                            <CheckIcon className="h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XMarkIcon className="h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {canEditUser(user) && (
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-maroon-600 hover:text-maroon-900"
                            title="Edit user"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                        {canResetPassword(user) && (
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Reset password to 'password123'"
                          >
                            <KeyIcon className="h-5 w-5" />
                          </button>
                        )}
                        {canDeleteUser(user) && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete user"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                        {!canEditUser(user) && !canResetPassword(user) && !canDeleteUser(user) && (
                          <span className="text-gray-400 text-sm">
                            No actions available
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingUser) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-maroon-500 focus:border-maroon-500 ${emailError ? 'border-red-300' : 'border-gray-300'}`}
                      required
                      disabled={!!editingUser}
                    />
                    {emailError && (
                      <p className="mt-1 text-sm text-red-600">{emailError}</p>
                    )}
                  </div>
                  
                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                        required={!editingUser}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      required
                    >
                      <option value="admin">Admin</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="operations">Operations</option>
                      <option value="logistics">Logistics</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingUser(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Access denied component for unauthorized users
function AccessDeniedUsers() {
  const { user } = useAuth()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow">
      <ShieldExclamationIcon className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 text-center mb-4 max-w-md">
        You don't have permission to access user management.
        {user?.role === 'supervisor' 
          ? ' Supervisors have limited access to user information.'
          : user?.role === 'operations' || user?.role === 'logistics'
          ? ' Operations and logistics staff cannot access user management.'
          : ' Please contact an administrator for access.'}
      </p>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">
          Current role: <span className="font-medium text-gray-900">{user?.role}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Required: Admin role with user management permissions
        </p>
      </div>
    </div>
  )
}

// Main page component with comprehensive RBAC protection
export default function UsersManagement() {
  return (
    <RoleGuard roles={['admin', 'supervisor']}>
      <PermissionGuard 
        permission={Permission.MANAGE_USERS}
        fallback={<AccessDeniedUsers />}
      >
        <UserManagementContent />
      </PermissionGuard>
    </RoleGuard>
  )
}
