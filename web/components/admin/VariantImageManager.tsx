'use client'

import { useState } from 'react'
import { PhotoIcon, TrashIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { ProductImage, Variant } from '@/lib/types'
import { api } from '@/lib/api-client'

interface VariantImageManagerProps {
  variant: Variant
  productId: number
  onImagesUpdate: (variantId: number, images: ProductImage[]) => void
  disabled?: boolean
}

export default function VariantImageManager({ 
  variant, 
  productId, 
  onImagesUpdate, 
  disabled = false 
}: VariantImageManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const variantImages = variant.images || []

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
        formData.append('alt_text', `${variant.sku} - ${variant.size || ''} ${variant.color || ''}`.trim())
        formData.append('is_primary', variantImages.length === 0 ? 'true' : 'false')

        const response = await api<any>(`/api/admin/variants/${variant.id}/images`, {
          method: 'POST',
          body: formData
        })

        uploadedImages.push({
          id: response.id,
          url: response.url,
          alt_text: response.alt_text,
          width: response.width,
          height: response.height,
          sort_order: variantImages.length + uploadedImages.length,
          is_primary: variantImages.length === 0 && uploadedImages.length === 1,
          variant_id: variant.id,
          responsive_urls: response.responsive_urls
        })
      }

      const updatedImages = [...variantImages, ...uploadedImages]
      onImagesUpdate(variant.id, updatedImages)
    } catch (error: any) {
      console.error('Failed to upload variant images:', error)
      setUploadError(error.message || 'Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      await api(`/api/admin/images/${imageId}`, { method: 'DELETE' })
      const updatedImages = variantImages.filter(img => img.id !== imageId)
      onImagesUpdate(variant.id, updatedImages)
    } catch (error: any) {
      console.error('Failed to delete image:', error)
      alert('Failed to delete image. Please try again.')
    }
  }

  const handleSetPrimary = async (imageId: number) => {
    try {
      await api(`/api/admin/images/${imageId}?is_primary=true`, { method: 'PUT' })
      const updatedImages = variantImages.map(img => ({
        ...img,
        is_primary: img.id === imageId
      }))
      onImagesUpdate(variant.id, updatedImages)
    } catch (error: any) {
      console.error('Failed to set primary image:', error)
      alert('Failed to set primary image. Please try again.')
    }
  }

  const handleReorderImage = async (imageId: number, direction: 'up' | 'down') => {
    const currentIndex = variantImages.findIndex(img => img.id === imageId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= variantImages.length) return

    const reorderedImages = [...variantImages]
    const [movedImage] = reorderedImages.splice(currentIndex, 1)
    reorderedImages.splice(newIndex, 0, movedImage)

    // Update sort_order for all images
    const updatedImages = reorderedImages.map((img, index) => ({
      ...img,
      sort_order: index + 1
    }))

    try {
      // Update sort order on backend
      await api(`/api/admin/images/${imageId}?sort_order=${newIndex + 1}`, { method: 'PUT' })
      onImagesUpdate(variant.id, updatedImages)
    } catch (error: any) {
      console.error('Failed to reorder image:', error)
      alert('Failed to reorder image. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-900">
          Variant Images ({variantImages.length})
        </h4>
        {!disabled && (
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-maroon-700 text-white rounded-md hover:bg-maroon-800 transition-colors">
              <PhotoIcon className="h-4 w-4" />
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
        <div className="text-sm text-blue-600">
          Uploading images...
        </div>
      )}

      {uploadError && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {uploadError}
        </div>
      )}

      {/* Images Grid */}
      {variantImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {variantImages.map((image, index) => (
            <div key={image.id} className="relative group">
              <img
                src={image.responsive_urls?.small || image.url}
                alt={image.alt_text || `Variant image ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              
              {/* Primary Badge */}
              {image.is_primary && (
                <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                  PRIMARY
                </div>
              )}

              {/* Action Buttons */}
              {!disabled && (
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                  <button
                    onClick={() => window.open(image.url, '_blank')}
                    className="p-1.5 bg-white text-gray-700 rounded hover:bg-gray-100"
                    title="View full size"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  
                  {!image.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(image.id)}
                      className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                      title="Set as primary"
                    >
                      ⭐
                    </button>
                  )}

                  {index > 0 && (
                    <button
                      onClick={() => handleReorderImage(image.id, 'up')}
                      className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                      title="Move up"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                  )}

                  {index < variantImages.length - 1 && (
                    <button
                      onClick={() => handleReorderImage(image.id, 'down')}
                      className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                      title="Move down"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
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
        <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <PhotoIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No variant-specific images</p>
          {!disabled && (
            <p className="text-xs">Upload images specific to this variant</p>
          )}
        </div>
      )}
    </div>
  )
}
