'use client'

import { useState } from 'react'
import { PhotoIcon, TrashIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { ProductImage } from '@/lib/types'
import { api } from '@/lib/api-client'

interface ProductImageManagerProps {
  productId: number
  images: ProductImage[]
  onImagesUpdate: (images: ProductImage[]) => void
  disabled?: boolean
}

export default function ProductImageManager({ 
  productId, 
  images, 
  onImagesUpdate, 
  disabled = false 
}: ProductImageManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Filter out variant-specific images (only show product-level images)
  const productImages = images.filter(img => !img.variant_id)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setUploadError(null)

    try {
      const uploadedImages: ProductImage[] = []

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt_text', `Product image`)
        formData.append('is_primary', productImages.length === 0 && uploadedImages.length === 0 ? 'true' : 'false')

        const response = await api<any>(`/api/admin/products/${productId}/images`, {
          method: 'POST',
          body: formData
        })

        uploadedImages.push({
          id: response.id,
          url: response.url,
          alt_text: response.alt_text,
          width: response.width,
          height: response.height,
          sort_order: productImages.length + uploadedImages.length,
          is_primary: productImages.length === 0 && uploadedImages.length === 1,
          responsive_urls: response.responsive_urls
        })
      }

      const updatedImages = [...images, ...uploadedImages]
      onImagesUpdate(updatedImages)
    } catch (error: any) {
      console.error('Failed to upload product images:', error)
      setUploadError(error.message || 'Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      await api(`/api/admin/images/${imageId}`, { method: 'DELETE' })
      const updatedImages = images.filter(img => img.id !== imageId)
      onImagesUpdate(updatedImages)
    } catch (error: any) {
      console.error('Failed to delete image:', error)
      alert('Failed to delete image. Please try again.')
    }
  }

  const handleSetPrimary = async (imageId: number) => {
    try {
      await api(`/api/admin/images/${imageId}?is_primary=true`, { method: 'PUT' })
      const updatedImages = images.map(img => ({
        ...img,
        is_primary: img.id === imageId && !img.variant_id // Only product images can be primary
      }))
      onImagesUpdate(updatedImages)
    } catch (error: any) {
      console.error('Failed to set primary image:', error)
      alert('Failed to set primary image. Please try again.')
    }
  }

  const handleReorderImage = async (imageId: number, direction: 'up' | 'down') => {
    const currentIndex = productImages.findIndex(img => img.id === imageId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= productImages.length) return

    const reorderedImages = [...productImages]
    const [movedImage] = reorderedImages.splice(currentIndex, 1)
    reorderedImages.splice(newIndex, 0, movedImage)

    // Update sort_order for all product images
    const updatedProductImages = reorderedImages.map((img, index) => ({
      ...img,
      sort_order: index + 1
    }))

    try {
      // Update sort order on backend
      await api(`/api/admin/images/${imageId}?sort_order=${newIndex + 1}`, { method: 'PUT' })
      
      // Merge with variant images
      const variantImages = images.filter(img => img.variant_id)
      const allUpdatedImages = [...updatedProductImages, ...variantImages]
      onImagesUpdate(allUpdatedImages)
    } catch (error: any) {
      console.error('Failed to reorder image:', error)
      alert('Failed to reorder image. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Product Images</h3>
          <p className="text-sm text-gray-600">
            General product images ({productImages.length})
          </p>
        </div>
        {!disabled && (
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors">
              <PhotoIcon className="h-5 w-5" />
              Add Images
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Upload Status */}
      {uploading && (
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          Uploading images...
        </div>
      )}

      {uploadError && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {uploadError}
        </div>
      )}

      {/* Images Grid */}
      {productImages.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {productImages.map((image, index) => (
            <div key={image.id} className="relative group">
              <img
                src={image.responsive_urls?.medium || image.url}
                alt={image.alt_text || `Product image ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-200"
              />
              
              {/* Primary Badge */}
              {image.is_primary && (
                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                  PRIMARY
                </div>
              )}

              {/* Action Buttons */}
              {!disabled && (
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    onClick={() => window.open(image.url, '_blank')}
                    className="p-2 bg-white text-gray-700 rounded hover:bg-gray-100"
                    title="View full size"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  
                  {!image.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(image.id)}
                      className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                      title="Set as primary"
                    >
                      ⭐
                    </button>
                  )}

                  {index > 0 && (
                    <button
                      onClick={() => handleReorderImage(image.id, 'up')}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      title="Move up"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                  )}

                  {index < productImages.length - 1 && (
                    <button
                      onClick={() => handleReorderImage(image.id, 'down')}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      title="Move down"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                    title="Delete image"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <PhotoIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No product images</p>
          <p className="text-sm">Upload general product images that apply to all variants</p>
          {!disabled && (
            <p className="text-xs mt-2 text-gray-400">
              These images will be shown when no variant is selected
            </p>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Image Management Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Product images are shown when no specific variant is selected</li>
          <li>• Variant-specific images override product images when a variant is selected</li>
          <li>• The first image uploaded becomes the primary image automatically</li>
          <li>• Drag and drop or use reorder buttons to change image order</li>
        </ul>
      </div>
    </div>
  )
}
