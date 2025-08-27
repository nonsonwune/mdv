'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { DEFAULT_CATEGORIES } from '@/lib/default-data'
import Alert from '@/components/ui/Alert'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
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
  const [success, setSuccess] = useState<string | null>(null)
  const [createdProductId, setCreatedProductId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  
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

  useEffect(() => {
    if (categories.length === 0) {
      // Initialize with default categories if no categories exist
      setCategories(DEFAULT_CATEGORIES)
    }
  }, [categories])

  const fetchCategories = async () => {
    try {
      const response = await api<Category[]>('/api/admin/categories')
      if (response && response.length > 0) {
        setCategories(response)
      } else {
        // Use default categories if no categories exist
        setCategories(DEFAULT_CATEGORIES)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      // Fallback to default categories on error
      setCategories(DEFAULT_CATEGORIES)
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
    } else if (formData.title.length < 3) {
      newErrors.title = 'Product title must be at least 3 characters'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Product slug is required'
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
      newErrors.slug = 'Invalid slug format. Use lowercase letters, numbers, and hyphens only'
    }

    if (!formData.category_id) {
      newErrors.category = 'Please select a category'
    }

    formData.variants.forEach((variant, index) => {
      if (!variant.sku.trim()) {
        newErrors[`variant-${index}-sku`] = 'SKU is required'
      } else if (!/^[A-Z0-9-]+$/.test(variant.sku)) {
        newErrors[`variant-${index}-sku`] = 'SKU must contain only uppercase letters, numbers, and hyphens'
      }

      if (variant.price <= 0) {
        newErrors[`variant-${index}-price`] = 'Price must be greater than 0'
      }

      if (variant.initial_quantity < 0) {
        newErrors[`variant-${index}-initial_quantity`] = 'Initial quantity cannot be negative'
      }

      if (variant.safety_stock < 0) {
        newErrors[`variant-${index}-safety_stock`] = 'Safety stock cannot be negative'
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
        category_id: formData.category_id!,
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

      const response = await api<any>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      // Show image upload step
      setCreatedProductId(response.id)
      setSuccess('Product created. Add images below (first will be primary).')
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    setSelectedFiles(files)
    setUploadSuccess(null)
  }

  const handleUploadImages = async () => {
    if (!createdProductId || selectedFiles.length === 0) return
    setUploading(true)
    setErrors({})
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const fd = new FormData()
        fd.append('file', selectedFiles[i])
        fd.append('alt_text', formData.title)
        // First file becomes primary
        fd.append('is_primary', i === 0 ? 'true' : 'false')
        await api(`/api/admin/products/${createdProductId}/images`, {
          method: 'POST',
          body: fd
        })
      }
      setUploadSuccess('Images uploaded successfully')
      // Redirect after short delay
      setTimeout(() => {
        router.push('/admin/products')
      }, 1200)
    } catch (err: any) {
      console.error('Failed to upload images:', err)
      setErrors({ general: 'Failed to upload images. Please try again.' })
    } finally {
      setUploading(false)
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
      {/* Notifications */}
        {errors.general && (
          <Alert variant="danger" closable onClose={() => setErrors({})} className="animate-fade-in">
            {errors.general}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="animate-fade-in">
            {success}
          </Alert>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Title *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                error={errors.title}
                placeholder="Enter product title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Slug *
              </label>
              <Input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                error={errors.slug}
                placeholder="product-slug"
                required
                helperText="Used in the product's URL. Example: premium-t-shirt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <Input
                as="select"
                value={formData.category_id || ''}
                onChange={(e) => handleInputChange('category_id', e.target.value ? parseInt(e.target.value) : null)}
                required
                error={errors.category}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Input>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compare At Price (₦)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.compare_at_price || ''}
                onChange={(e) => handleInputChange('compare_at_price', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                helperText="Original price to show as crossed out"
                leftIcon={<span className="text-gray-500">₦</span>}
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
            </label>
            <Input
              as="textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
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
                    <Input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                      placeholder="SKU-001"
                      required
                      error={errors[`variant-${index}-sku`]}
                      helperText="Example: PREM-SHIRT-BLK-L"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Size
                    </label>
                    <Input
                      type="text"
                      value={variant.size}
                      onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                      placeholder="M, L, XL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <Input
                      type="text"
                      value={variant.color}
                      onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                      placeholder="Black, White, Red"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₦) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.price}
                      onChange={(e) => handleVariantChange(index, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      leftIcon={<span className="text-gray-500">₦</span>}
                      error={errors[`variant-${index}-price`]}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Stock
                    </label>
                    <Input
                      type="number"
                      value={variant.initial_quantity}
                      onChange={(e) => handleVariantChange(index, 'initial_quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Safety Stock
                    </label>
                    <Input
                      type="number"
                      value={variant.safety_stock}
                      onChange={(e) => handleVariantChange(index, 'safety_stock', parseInt(e.target.value) || 0)}
                      placeholder="5"
                      helperText="Alert when stock falls below this level"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            loading={loading}
            leftIcon={loading ? undefined : <PlusIcon className="h-4 w-4" />}
          >
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>

      {/* Post-create image upload step */}
      {createdProductId && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Add Images</h2>
          <p className="text-gray-600 mb-4">Upload one or more images for this product. The first image becomes the primary image.</p>
          {uploadSuccess && (
            <Alert variant="success" className="mb-4">{uploadSuccess}</Alert>
          )}
          <div className="flex items-center gap-4">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            <Button
              type="button"
              onClick={handleUploadImages}
              loading={uploading}
              leftIcon={uploading ? undefined : <PhotoIcon className="h-4 w-4" />}
              disabled={selectedFiles.length === 0}
            >
              {uploading ? 'Uploading...' : 'Upload Images'}
            </Button>
          </div>
          {selectedFiles.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              {selectedFiles.length} file(s) selected. First will be primary.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
