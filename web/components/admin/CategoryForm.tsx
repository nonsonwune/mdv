"use client"

import { useState, useEffect } from 'react'
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface Category {
  id: number
  name: string
  slug: string
  parent_id?: number
  description?: string
  sort_order: number
  is_active: boolean
  show_in_navigation: boolean
  navigation_icon?: string
  is_sale_category: boolean
  auto_sale_threshold?: number
  product_count: number
  children?: Category[]
}

interface CategoryFormData {
  name: string
  slug?: string
  description?: string
  is_active: boolean
  parent_id?: number
  sort_order?: number
  show_in_navigation?: boolean
  navigation_icon?: string
  is_sale_category?: boolean
  auto_sale_threshold?: number
}

interface CategoryFormProps {
  category?: Category
  categories: Category[]
  onSubmit: (data: CategoryFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const NAVIGATION_ICONS = [
  { value: 'men', label: '👔 Men', description: 'Men\'s clothing and accessories' },
  { value: 'women', label: '👗 Women', description: 'Women\'s clothing and accessories' },
  { value: 'essentials', label: '✨ Essentials', description: 'Essential items and basics' },
  { value: 'sale', label: '🏷️ Sale', description: 'Sale and discounted items' },
  { value: 'shoes', label: '👟 Shoes', description: 'Footwear and shoes' },
  { value: 'shirts', label: '👕 Shirts', description: 'Shirts and tops' },
  { value: 'pants', label: '👖 Pants', description: 'Pants and bottoms' },
  { value: 'accessories', label: '👜 Accessories', description: 'Bags, belts, and accessories' },
  { value: 'watches', label: '⌚ Watches', description: 'Watches and timepieces' },
  { value: 'jewelry', label: '💍 Jewelry', description: 'Jewelry and precious items' },
]

export default function CategoryForm({ category, categories, onSubmit, onCancel, isLoading }: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    is_active: category?.is_active ?? true,
    parent_id: category?.parent_id || undefined,
    sort_order: category?.sort_order || 0,
    show_in_navigation: category?.show_in_navigation ?? false,
    navigation_icon: category?.navigation_icon || '',
    is_sale_category: category?.is_sale_category ?? false,
    auto_sale_threshold: category?.auto_sale_threshold || undefined,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !category) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[-\s]+/g, '-')
        .trim()
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.name, category])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required'
    }

    if (!formData.slug?.trim()) {
      newErrors.slug = 'Category slug is required'
    }

    if (formData.is_sale_category && formData.auto_sale_threshold && (formData.auto_sale_threshold < 1 || formData.auto_sale_threshold > 100)) {
      newErrors.auto_sale_threshold = 'Sale threshold must be between 1 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleInputChange = (field: keyof CategoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Filter out current category and its descendants from parent options
  const getAvailableParents = () => {
    if (!category) return categories

    const isDescendant = (cat: Category, ancestorId: number): boolean => {
      if (cat.id === ancestorId) return true
      return cat.children?.some(child => isDescendant(child, ancestorId)) || false
    }

    return categories.filter(cat => cat.id !== category.id && !isDescendant(cat, category.id))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {category ? 'Edit Category' : 'Create Category'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter category name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 ${
                  errors.slug ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="category-url-slug"
              />
              {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
              <p className="mt-1 text-sm text-gray-500">
                Used in URLs. Will be auto-generated from name if left empty.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                placeholder="Optional category description"
              />
            </div>
          </div>

          {/* Hierarchy */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Category Hierarchy</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Category
              </label>
              <select
                value={formData.parent_id || ''}
                onChange={(e) => handleInputChange('parent_id', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
              >
                <option value="">No parent (root category)</option>
                {getAvailableParents().map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select a parent category to create a subcategory.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                placeholder="0"
                min="0"
              />
              <p className="mt-1 text-sm text-gray-500">
                Lower numbers appear first in navigation and listings.
              </p>
            </div>
          </div>

          {/* Navigation Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Navigation Settings</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_in_navigation"
                checked={formData.show_in_navigation}
                onChange={(e) => handleInputChange('show_in_navigation', e.target.checked)}
                className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
              />
              <label htmlFor="show_in_navigation" className="ml-2 block text-sm text-gray-900">
                Show in main navigation
              </label>
            </div>
            <p className="text-sm text-gray-500">
              When enabled, this category will appear in the main navigation menu.
            </p>

            {formData.show_in_navigation && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Navigation Icon
                </label>
                <select
                  value={formData.navigation_icon || ''}
                  onChange={(e) => handleInputChange('navigation_icon', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                >
                  <option value="">No icon</option>
                  {NAVIGATION_ICONS.map((icon) => (
                    <option key={icon.value} value={icon.value}>
                      {icon.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Choose an icon to display next to the category name in navigation.
                </p>
              </div>
            )}
          </div>

          {/* Sale Category Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Sale Category Settings</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_sale_category"
                checked={formData.is_sale_category}
                onChange={(e) => handleInputChange('is_sale_category', e.target.checked)}
                className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
              />
              <label htmlFor="is_sale_category" className="ml-2 block text-sm text-gray-900">
                Automatic sale category
              </label>
            </div>
            <p className="text-sm text-gray-500">
              When enabled, products with discounts will automatically appear in this category.
            </p>

            {formData.is_sale_category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Discount Threshold (%)
                </label>
                <input
                  type="number"
                  value={formData.auto_sale_threshold || ''}
                  onChange={(e) => handleInputChange('auto_sale_threshold', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 ${
                    errors.auto_sale_threshold ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10"
                  min="1"
                  max="100"
                />
                {errors.auto_sale_threshold && (
                  <p className="mt-1 text-sm text-red-600">{errors.auto_sale_threshold}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Products with discounts above this percentage will automatically appear in this category.
                </p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Status</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active category
              </label>
            </div>
            <p className="text-sm text-gray-500">
              Inactive categories are hidden from customers but remain accessible to staff.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-maroon-600 border border-transparent rounded-md shadow-sm hover:bg-maroon-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
