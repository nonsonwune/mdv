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
  admin_count: number
  supervisor_count: number
  operations_count: number
  logistics_count: number
  recent_logins: number
}

const roleColors: Record<string, string> = {
  'admin': 'bg-red-100 text-red-800',
  'supervisor': 'bg-purple-100 text-purple-800',
  'operations': 'bg-blue-100 text-blue-800',
  'logistics': 'bg-green-100 text-green-800'
}

// Main user management content component
function UserManagementContent() {
  const { user: currentUser, hasPermission } = useAuth()
  const router = useRouter()
  
  // Permission checks
  const canManageUsers = hasPermission(Permission.MANAGE_USERS)
  const canViewUsers = hasPermission(Permission.VIEW_USERS) || hasPermission(Permission.MANAGE_USERS)
  const canDeleteUsers = hasPermission(Permission.DELETE_USERS) || hasPermission(Permission.MANAGE_USERS)
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

      const response = await api<User[]>(`/api/admin/users?${params}`)
      setUsers(Array.isArray(response) ? response : [])
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
        setEmailError('This email is already registered')
      } else {
        alert('Failed to create user')
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

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      await api(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      fetchUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user')
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

  // Fetch stats function
  const fetchStats = async () => {
    try {
      const response = await api<UserStats>('/api/admin/users/stats')
      setStats(response)
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  // Add to useEffect
  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [currentPage, searchTerm, roleFilter, statusFilter])

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
              Manage staff accounts, roles, and permissions
              {currentUser?.role === 'supervisor' && (
                <span className="text-amber-600 ml-2">(Limited Access)</span>
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
                <p className="text-2xl font-semibold text-gray-900">{stats.admin_count}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-purple-50">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Recent Logins</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recent_logins}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="operations">Operations</option>
              <option value="logistics">Logistics</option>
            </select>
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
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
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-maroon-600 hover:text-maroon-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
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
