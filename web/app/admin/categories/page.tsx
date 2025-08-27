'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useAuth, Permission } from '@/lib/auth-context'
import { PermissionGuard, RoleGuard } from '@/components/auth/permission-guards'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  TagIcon,
  FolderIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  Squares2X2Icon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  UserIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ArchiveBoxIcon,
  StarIcon,
  FireIcon
} from '@heroicons/react/24/outline'

interface Category {
  id: number
  name: string
  slug: string
  description?: string
  parent_id?: number
  parent_name?: string
  level: number
  sort_order: number
  is_active: boolean
  is_featured: boolean
  image_url?: string
  meta_title?: string
  meta_description?: string
  product_count: number
  created_at: string
  updated_at: string
  children?: Category[]
}

interface CategoryStats {
  total_categories: number
  active_categories: number
  featured_categories: number
  root_categories: number
  products_with_categories: number
  products_without_categories: number
  average_products_per_category: number
}

interface CategoryFormData {
  name: string
  slug: string
  description: string
  parent_id?: number
  sort_order: number
  is_active: boolean
  is_featured: boolean
  image_url?: string
  meta_title?: string
  meta_description?: string
}

// Generate slug from category name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with dashes
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
}

// Main category management content component
function CategoryManagementContent() {
  const { user, hasPermission, isRole } = useAuth()
  const router = useRouter()
  
  const [categories, setCategories] = useState<Category[]>([])
  const [hierarchicalCategories, setHierarchicalCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<CategoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [parentFilter, setParentFilter] = useState('')
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list')
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  
  // Modal and form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    is_active: true
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Permission checks
  const canManageCategories = hasPermission(Permission.MANAGE_CATEGORIES) || hasPermission(Permission.PRODUCT_CREATE)
  const canViewCategories = hasPermission(Permission.VIEW_CATEGORIES) || hasPermission(Permission.PRODUCT_CREATE)
  const canDeleteCategories = hasPermission(Permission.DELETE_CATEGORIES) || hasPermission(Permission.PRODUCT_CREATE)

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await api<Category[]>(`/api/admin/categories?${params}`)
      setCategories(response)
    } catch (error: any) {
      if (error?.message?.includes('Not authenticated') || error?.message?.includes('401')) {
        window.location.href = '/staff-login?error=authentication_required'
        return
      }
      
      if (!error?.message?.includes('401') && !error?.message?.includes('Not authenticated')) {
        console.error('Failed to fetch categories:', error)
      }
      
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [searchTerm, statusFilter])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset errors
    setFormErrors({})
    
    // Validation
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) {
      errors.name = 'Category name is required'
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSaving(true)
    try {
      const slug = generateSlug(formData.name)
      const payload = {
        ...formData,
        slug
      }

      if (editingCategory) {
        // Update existing category
        await api(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      } else {
        // Create new category
        await api('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      }

      // Reset form and close modal
      resetForm()
      setIsModalOpen(false)
      await fetchCategories()
      
    } catch (error: any) {
      console.error('Failed to save category:', error)
      if (error?.message?.includes('already exists')) {
        setFormErrors({ name: 'A category with this name already exists' })
      } else {
        setFormErrors({ submit: 'Failed to save category. Please try again.' })
      }
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (category: Category) => {
    if (category.product_count > 0) {
      alert(`Cannot delete "${category.name}" because it contains ${category.product_count} products. Please move or delete the products first.`)
      return
    }

    setDeleteConfirm(category)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    try {
      await api(`/api/admin/categories/${deleteConfirm.id}`, {
        method: 'DELETE'
      })

      setDeleteConfirm(null)
      await fetchCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
      alert('Failed to delete category. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active
    })
    setIsModalOpen(true)
  }

  // Reset form
  const resetForm = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      is_active: true
    })
    setFormErrors({})
  }

  // Filter categories
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && category.is_active) ||
                         (statusFilter === 'inactive' && !category.is_active)
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700"></div>
      </div>
    )
  }

  // Fetch stats function
  const fetchStats = async () => {
    try {
      const response = await api<CategoryStats>('/api/admin/categories/stats')
      setStats(response)
    } catch (error) {
      console.error('Failed to fetch category stats:', error)
    }
  }

  // Update useEffect to include stats
  useEffect(() => {
    fetchCategories()
    fetchStats()
  }, [searchTerm, statusFilter])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div>
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-600">
              Organize products with hierarchical categories
              {isRole('logistics') && (
                <span className="text-amber-600 ml-2">(View Only)</span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Squares2X2Icon className="h-4 w-4 inline mr-1" />
                Tree
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ListBulletIcon className="h-4 w-4 inline mr-1" />
                List
              </button>
            </div>

            {/* Export Categories */}
            <PermissionGuard permission={Permission.PRODUCT_VIEW}>
              <button
                onClick={() => {/* handleExportCategories() */}}
                className="flex items-center gap-2 px-4 py-2 border border-maroon-300 text-maroon-700 rounded-lg hover:bg-maroon-50 transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Export
              </button>
            </PermissionGuard>
            
            {/* Add Category */}
            <PermissionGuard permission={Permission.MANAGE_CATEGORIES}>
              <button
                onClick={() => {
                  resetForm()
                  setIsModalOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Add Category
              </button>
            </PermissionGuard>
          </div>
        </div>
        
        {/* Role-specific notices */}
        {isRole('operations') && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                <strong>Operations Role:</strong> You can view and manage categories for product organization, but cannot delete categories with existing products.
              </p>
            </div>
          </div>
        )}
        
        {isRole('logistics') && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <ShieldExclamationIcon className="h-5 w-5 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                <strong>Logistics Role:</strong> You have view-only access to categories. Use this for understanding product organization during fulfillment.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Category Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-50">
                <TagIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Categories</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_categories}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Categories</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active_categories}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-50">
                <StarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Featured Categories</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.featured_categories || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-purple-50">
                <CubeIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Products with Categories</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.products_with_categories || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center gap-4">
            <div className="flex gap-4 flex-1">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <button
                onClick={fetchCategories}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No categories</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new category.</p>
            <div className="mt-6">
              <PermissionGuard permission={Permission.MANAGE_CATEGORIES}>
                <button
                  onClick={() => {
                    resetForm()
                    setIsModalOpen(true)
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-maroon-600 hover:bg-maroon-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add Category
                </button>
              </PermissionGuard>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <PermissionGuard permission={Permission.MANAGE_CATEGORIES}>
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-maroon-600 hover:text-maroon-900 mr-4"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => { setIsModalOpen(false); resetForm(); }}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-maroon-500 focus:border-maroon-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-maroon-500 focus:border-maroon-500"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex items-center mb-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active category
                  </label>
                </div>
                {formErrors.submit && (
                  <div className="mb-4 text-sm text-red-600">{formErrors.submit}</div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); resetForm(); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-maroon-600 text-white rounded-md hover:bg-maroon-700 disabled:opacity-50"
                  >
                    {saving ? (editingCategory ? 'Updating...' : 'Saving...') : (editingCategory ? 'Update' : 'Save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setDeleteConfirm(null)}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Category</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete the category "{deleteConfirm.name}"?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Access denied component for unauthorized users
function AccessDeniedCategories() {
  const { user } = useAuth()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow">
      <ShieldExclamationIcon className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 text-center mb-4 max-w-md">
        You don't have permission to access category management.
        {user?.role === 'operations' 
          ? ' Operations staff can view categories but cannot modify them.'
          : user?.role === 'logistics'
          ? ' Logistics staff have limited access to category information.'
          : ' Please contact an administrator for access.'}
      </p>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">
          Current role: <span className="font-medium text-gray-900">{user?.role}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Required: Admin or Supervisor role with category management permissions
        </p>
      </div>
    </div>
  )
}

// Main page component with comprehensive RBAC protection
export default function CategoryManagementPage() {
  return (
    <RoleGuard roles={['admin', 'supervisor']}>
      <PermissionGuard 
        permission={Permission.PRODUCT_CREATE}
        fallback={<AccessDeniedCategories />}
      >
        <CategoryManagementContent />
      </PermissionGuard>
    </RoleGuard>
  )
}
