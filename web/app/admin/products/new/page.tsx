'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface ProductVariant {
  id: string
  sku: string
  size: string
  color: string
  price: number
  initial_quantity: number
  safety_stock: number
}

interface Category {
  id: number
  name: string
  slug: string
}

interface ProductFormData {
  title: string
  slug: string
  description: string
  category_id: number | null
  compare_at_price: number | null
  variants: ProductVariant[]
}

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    slug: '',
    description: '',
    category_id: null,
    compare_at_price: null,
    variants: [{
      id: Date.now().toString(),
      sku: '',
      size: '',
      color: '',
      price: 0,
      initial_quantity: 0,
      safety_stock: 5
    }]
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !formData.slug) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.title, formData.slug])

  const fetchCategories = async () => {
    try {
      const response = await api<Category[]>('/api/admin/categories')
      setCategories(response)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...formData.variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setFormData(prev => ({ ...prev, variants: newVariants }))
  }

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: Date.now().toString(),
      sku: '',
      size: '',
      color: '',
      price: 0,
      initial_quantity: 0,
      safety_stock: 5
    }
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }))
  }

  const removeVariant = (index: number) => {
    if (formData.variants.length > 1) {
      const newVariants = formData.variants.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, variants: newVariants }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Product title is required'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Product slug is required'
    }

    formData.variants.forEach((variant, index) => {
      if (!variant.sku.trim()) {
        newErrors[`variant-${index}-sku`] = 'SKU is required'
      }
      if (variant.price <= 0) {
        newErrors[`variant-${index}-price`] = 'Price must be greater than 0'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description || undefined,
        category_id: formData.category_id || undefined,
        compare_at_price: formData.compare_at_price || undefined,
        variants: formData.variants.map(variant => ({
          sku: variant.sku,
          size: variant.size || undefined,
          color: variant.color || undefined,
          price: variant.price,
          initial_quantity: variant.initial_quantity,
          safety_stock: variant.safety_stock
        }))
      }

      const response = await api('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      // Redirect to products list or product detail
      router.push('/admin/products')
    } catch (error: any) {
      console.error('Failed to create product:', error)
      if (error.message.includes('Slug already exists')) {
        setErrors({ slug: 'This slug is already taken' })
      } else if (error.message.includes('SKU')) {
        setErrors({ general: 'One or more SKUs are already in use' })
      } else {
        setErrors({ general: 'Failed to create product. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Product</h1>
        <p className="text-gray-600">Add a new product to your catalog</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-maroon-500 focus:border-maroon-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter product title"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-maroon-500 focus:border-maroon-500 ${
                  errors.slug ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="product-slug"
              />
              {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => handleInputChange('category_id', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compare At Price (₦)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.compare_at_price || ''}
                onChange={(e) => handleInputChange('compare_at_price', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">Original price to show as crossed out</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              placeholder="Enter product description..."
            />
          </div>
        </div>

        {/* Variants */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Product Variants</h2>
            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Variant
            </button>
          </div>

          <div className="space-y-6">
            {formData.variants.map((variant, index) => (
              <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Variant {index + 1}</h3>
                  {formData.variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU *
                    </label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-maroon-500 focus:border-maroon-500 ${
                        errors[`variant-${index}-sku`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="SKU-001"
                    />
                    {errors[`variant-${index}-sku`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`variant-${index}-sku`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Size
                    </label>
                    <input
                      type="text"
                      value={variant.size}
                      onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      placeholder="M, L, XL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      value={variant.color}
                      onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      placeholder="Black, White, Red"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₦) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={variant.price}
                      onChange={(e) => handleVariantChange(index, 'price', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-maroon-500 focus:border-maroon-500 ${
                        errors[`variant-${index}-price`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    {errors[`variant-${index}-price`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`variant-${index}-price`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Stock
                    </label>
                    <input
                      type="number"
                      value={variant.initial_quantity}
                      onChange={(e) => handleVariantChange(index, 'initial_quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Safety Stock
                    </label>
                    <input
                      type="number"
                      value={variant.safety_stock}
                      onChange={(e) => handleVariantChange(index, 'safety_stock', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
