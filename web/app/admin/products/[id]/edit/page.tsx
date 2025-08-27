'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  PencilIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Category {
  id: number
  name: string
  slug: string
}

interface ProductVariant {
  id: number
  sku: string
  size?: string
  color?: string
  price: number
  stock_quantity: number
  safety_stock: number
  is_active: boolean
}

interface ProductImage {
  id: number
  url: string
  alt_text?: string
  display_order: number
}

interface Product {
  id: number
  title: string
  description?: string
  category_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
  variants: ProductVariant[]
  images: ProductImage[]
}

export default function ProductEditPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [deletedImages, setDeletedImages] = useState<number[]>([])

  useEffect(() => {
    Promise.all([
      fetchProduct(),
      fetchCategories()
    ])
  }, [params.id])

  useEffect(() => {
    if (product) {
      setTitle(product.title)
      setDescription(product.description || '')
      setCategoryId(product.category_id || '')
      setIsActive((product as any).is_active !== undefined ? Boolean((product as any).is_active) : true)
      setVariants([...product.variants])
      setImages([...product.images])
    }
  }, [product])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await api<Product>(`/api/admin/products/${params.id}`)
      setProduct(response)
    } catch (error) {
      console.error('Failed to fetch product:', error)
      alert('Failed to load product details')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api<Category[]>('/api/admin/categories')
      setCategories(response)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      setCategories([])
    }
  }

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: Date.now(), // Temporary ID for new variants
      sku: '',
      size: '',
      color: '',
      price: 0,
      stock_quantity: 0,
      safety_stock: 0,
      is_active: true
    }
    setVariants([...variants, newVariant])
  }

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updatedVariants = [...variants]
    updatedVariants[index] = { ...updatedVariants[index], [field]: value }
    setVariants(updatedVariants)
  }

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewImages([...newImages, ...files])
  }

  const handleRemoveNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index))
  }

  const handleDeleteExistingImage = (imageId: number) => {
    setDeletedImages([...deletedImages, imageId])
    setImages(images.filter(img => img.id !== imageId))
  }

  const handleImageOrderChange = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images]
    const [movedImage] = updatedImages.splice(fromIndex, 1)
    updatedImages.splice(toIndex, 0, movedImage)
    
    // Update display_order
    updatedImages.forEach((img, index) => {
      img.display_order = index + 1
    })
    
    setImages(updatedImages)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Product title is required'
    }

    if (variants.length === 0) {
      newErrors.variants = 'At least one variant is required'
    } else {
      variants.forEach((variant, index) => {
        if (!variant.sku.trim()) {
          newErrors[`variant_${index}_sku`] = 'SKU is required'
        }
        if (variant.price <= 0) {
          newErrors[`variant_${index}_price`] = 'Price must be greater than 0'
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setSaving(true)
    try {
      // Prepare form data for file uploads
      const formData = new FormData()
      
      // Add product data
      formData.append('title', title)
      formData.append('description', description)
      if (categoryId) formData.append('category_id', categoryId.toString())
      if (typeof isActive === 'boolean') {
        formData.append('is_active', String(isActive))
      }
      
      // Add variants data
      formData.append('variants', JSON.stringify(variants))
      
      // Add deleted images
      if (deletedImages.length > 0) {
        formData.append('deleted_images', JSON.stringify(deletedImages))
      }
      
      // Add existing images with updated order
      formData.append('existing_images', JSON.stringify(images))
      
      // Add new image files
      newImages.forEach((file, index) => {
        formData.append(`new_images`, file)
      })

      await api(`/api/admin/products/${params.id}`, {
        method: 'PUT',
        body: formData
      })

      alert('Product updated successfully!')
      router.push('/admin/products')
    } catch (error) {
      console.error('Failed to update product:', error)
      alert('Failed to update product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    window.open(`/products/${params.id}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Product not found</h3>
        <p className="text-gray-500 mb-4">The product you're trying to edit doesn't exist.</p>
        <button
          onClick={() => router.back()}
          className="text-maroon-600 hover:text-maroon-500"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600">Update product information, variants, and images</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <EyeIcon className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-maroon-500 focus:border-maroon-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter product title"
                />
                {errors.title && (
                  <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                  placeholder="Product description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                >
                  <option value="">Select a category (optional)</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Product is active (visible to customers)
                </label>
              </div>
            </div>
          </div>

          {/* Product Variants */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Product Variants</h3>
                <button
                  onClick={handleAddVariant}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Variant
                </button>
              </div>
              {errors.variants && (
                <p className="text-red-600 text-sm mt-2">{errors.variants}</p>
              )}
            </div>
            <div className="p-6">
              {variants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PlusIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No variants added yet</p>
                  <p className="text-sm">Click "Add Variant" to create the first variant</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div key={variant.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium text-gray-900">Variant #{index + 1}</h4>
                        <button
                          onClick={() => handleRemoveVariant(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SKU *
                          </label>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => handleUpdateVariant(index, 'sku', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-maroon-500 focus:border-maroon-500 ${
                              errors[`variant_${index}_sku`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="e.g., TSH-001-M"
                          />
                          {errors[`variant_${index}_sku`] && (
                            <p className="text-red-600 text-sm mt-1">{errors[`variant_${index}_sku`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Size
                          </label>
                          <input
                            type="text"
                            value={variant.size || ''}
                            onChange={(e) => handleUpdateVariant(index, 'size', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                            placeholder="e.g., M, L, XL"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <input
                            type="text"
                            value={variant.color || ''}
                            onChange={(e) => handleUpdateVariant(index, 'color', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                            placeholder="e.g., Red, Blue"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price}
                            onChange={(e) => handleUpdateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-maroon-500 focus:border-maroon-500 ${
                              errors[`variant_${index}_price`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="0.00"
                          />
                          {errors[`variant_${index}_price`] && (
                            <p className="text-red-600 text-sm mt-1">{errors[`variant_${index}_price`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={variant.stock_quantity}
                            onChange={(e) => handleUpdateVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
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
                            min="0"
                            value={variant.safety_stock}
                            onChange={(e) => handleUpdateVariant(index, 'safety_stock', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center">
                        <input
                          type="checkbox"
                          id={`variant_${index}_active`}
                          checked={variant.is_active}
                          onChange={(e) => handleUpdateVariant(index, 'is_active', e.target.checked)}
                          className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`variant_${index}_active`} className="ml-2 block text-sm text-gray-700">
                          Variant is active
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Images */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Product Images</h3>
              <p className="text-sm text-gray-600">Drag to reorder images</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Existing Images */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Current Images</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((image, index) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.url}
                          alt={image.alt_text || `Product image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg"></div>
                        <button
                          onClick={() => handleDeleteExistingImage(image.id)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images Preview */}
              {newImages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">New Images</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {newImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`New image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg"></div>
                        <button
                          onClick={() => handleRemoveNewImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                          NEW
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-maroon-600 hover:text-maroon-500">
                    Upload images
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB each</p>
              </div>
            </div>
          </div>

          {/* Product Status */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Product Status</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Variants</span>
                <span className="text-sm font-medium text-gray-900">{variants.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Stock</span>
                <span className="text-sm font-medium text-gray-900">
                  {variants.reduce((sum, v) => sum + v.stock_quantity, 0)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Images</span>
                <span className="text-sm font-medium text-gray-900">
                  {images.length + newImages.length}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  <p>Created: {new Date(product.created_at).toLocaleDateString()}</p>
                  <p>Updated: {new Date(product.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
