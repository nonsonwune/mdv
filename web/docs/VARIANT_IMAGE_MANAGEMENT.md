# Variant-Specific Image Management

## Overview

The MDV e-commerce platform now supports variant-specific image management, allowing administrators to upload and manage images at both the product level and individual variant level. This enables customers to see different images when selecting different product variants (e.g., different colors, sizes, or styles).

## Architecture

### Backend Implementation

- **Database Schema**: Added `variant_id` column to `product_images` table
- **API Endpoints**: 
  - `/api/admin/products/{id}/images` - Product-level image management
  - `/api/admin/variants/{id}/images` - Variant-specific image management
- **Image Storage**: Cloudinary with organized folder structure:
  - Product images: `products/{product_id}/`
  - Variant images: `products/{product_id}/variants/{variant_id}/`

### Frontend Implementation

- **Components**:
  - `ProductImageManager` - Manages product-level images
  - `VariantImageManager` - Manages variant-specific images
- **Integration**: Both components integrated into the product edit page
- **Type Safety**: Updated TypeScript interfaces to support variant images

## Features

### Product-Level Images
- **Purpose**: General product images shown when no variant is selected
- **Primary Image**: First uploaded image becomes the primary product image
- **Fallback**: Used when variant has no specific images
- **Management**: Upload, delete, reorder, set primary

### Variant-Specific Images
- **Purpose**: Images specific to individual variants (color, size, style)
- **Override**: Variant images override product images when variant is selected
- **Organization**: Stored in variant-specific folders for better organization
- **Management**: Upload, delete, reorder, set primary per variant

### Image Processing
- **Responsive URLs**: Automatic generation of multiple sizes (320px, 640px, 768px, 1024px, 1280px, 1920px)
- **Optimized Formats**: Automatic format optimization (WebP, JPEG, PNG)
- **Thumbnails**: Small and medium thumbnails for admin interface
- **Validation**: File format and size validation on upload

## Usage Guide

### For Administrators

#### Managing Product Images
1. Navigate to **Admin > Products > Edit Product**
2. In the **Product Images** section:
   - Click "Add Images" to upload general product images
   - Use action buttons to view, set primary, reorder, or delete images
   - These images are shown when no variant is selected

#### Managing Variant Images
1. In the **Product Variants** section of the edit page:
2. For each variant, find the **Variant Images** subsection:
   - Click "Add Images" to upload variant-specific images
   - These images will be shown when this variant is selected
   - Each variant can have its own set of images

#### Best Practices
- **Product Images**: Upload 1-3 general product images that represent the overall product
- **Variant Images**: Upload specific images for variants that look significantly different
- **Image Quality**: Use high-resolution images (minimum 800x800px recommended)
- **Consistency**: Maintain consistent lighting and background across variant images
- **Primary Images**: Ensure each variant has a clear primary image

### Image Display Logic

```typescript
// Frontend logic for displaying images
function getDisplayImages(product: Product, selectedVariant?: Variant): ProductImage[] {
  if (selectedVariant?.images && selectedVariant.images.length > 0) {
    // Show variant-specific images if available
    return selectedVariant.images
  }
  
  // Fallback to product-level images
  return product.images.filter(img => !img.variant_id)
}
```

## API Reference

### Upload Variant Image
```http
POST /api/admin/variants/{variant_id}/images
Content-Type: multipart/form-data

file: [image file]
alt_text: "Optional alt text"
is_primary: true|false
```

### Response
```json
{
  "id": 123,
  "product_id": 1,
  "url": "https://res.cloudinary.com/.../products/1/variants/2/image.jpg",
  "public_id": "products/1/variants/2/image",
  "width": 1200,
  "height": 1200,
  "size": 245760,
  "format": "jpg",
  "responsive_urls": {
    "original": "https://res.cloudinary.com/.../products/1/variants/2/image.jpg",
    "w320": "https://res.cloudinary.com/.../c_limit,w_320/.../image",
    "w640": "https://res.cloudinary.com/.../c_limit,w_640/.../image",
    "w768": "https://res.cloudinary.com/.../c_limit,w_768/.../image",
    "w1024": "https://res.cloudinary.com/.../c_limit,w_1024/.../image",
    "w1280": "https://res.cloudinary.com/.../c_limit,w_1280/.../image",
    "w1920": "https://res.cloudinary.com/.../c_limit,w_1920/.../image",
    "thumbnail": "https://res.cloudinary.com/.../c_fill,h_150,w_150/.../image",
    "small": "https://res.cloudinary.com/.../c_limit,h_300,w_300/.../image",
    "medium": "https://res.cloudinary.com/.../c_limit,h_600,w_600/.../image"
  },
  "message": "Image uploaded successfully"
}
```

### Update Image Properties
```http
PUT /api/admin/images/{image_id}?is_primary=true&sort_order=1
```

### Delete Image
```http
DELETE /api/admin/images/{image_id}
```

## Component API

### ProductImageManager

```tsx
<ProductImageManager
  productId={number}
  images={ProductImage[]}
  onImagesUpdate={(images: ProductImage[]) => void}
  disabled={boolean}
/>
```

### VariantImageManager

```tsx
<VariantImageManager
  variant={Variant}
  productId={number}
  onImagesUpdate={(variantId: number, images: ProductImage[]) => void}
  disabled={boolean}
/>
```

## Migration Notes

### Database Migration
- Added `variant_id` column to `product_images` table
- Added foreign key constraint to `variants` table
- Added index for performance optimization
- Backward compatible: existing images remain product-level

### Frontend Updates
- Updated TypeScript types to include `variant_id` and `responsive_urls`
- Created new image management components
- Integrated components into product edit page
- Maintained backward compatibility with existing image handling

## Troubleshooting

### Common Issues

1. **Images not uploading**
   - Check file size (max 10MB)
   - Verify file format (JPEG, PNG, GIF, WebP supported)
   - Ensure proper authentication

2. **Variant images not showing**
   - Verify variant has uploaded images
   - Check that variant is properly selected
   - Ensure images have correct `variant_id`

3. **Performance issues**
   - Use responsive URLs for appropriate screen sizes
   - Implement lazy loading for image galleries
   - Consider image compression for large files

### Debug Information
- Check browser console for upload errors
- Verify API responses include `responsive_urls`
- Confirm database has `variant_id` column

## Future Enhancements

- **Bulk Upload**: Upload multiple images for multiple variants at once
- **Image Cropping**: Built-in image cropping and editing tools
- **AI Tagging**: Automatic alt text generation using AI
- **Image Analytics**: Track which variant images perform best
- **Video Support**: Support for variant-specific product videos
