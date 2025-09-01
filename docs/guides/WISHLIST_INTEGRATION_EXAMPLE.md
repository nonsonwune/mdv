# Wishlist Integration Examples

## 🔧 **How to Integrate Wishlist Buttons into Product Pages**

### **1. Product Detail Page Integration**

```typescript
// In your product detail page component
import { WishlistButtonFull } from '@/components/ui/WishlistButton'

export default function ProductDetailPage({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0])

  return (
    <div className="product-detail">
      {/* Product images and info */}
      
      <div className="product-actions flex gap-4">
        {/* Add to Cart Button */}
        <button className="flex-1 bg-maroon-600 text-white px-6 py-3 rounded-lg">
          Add to Cart
        </button>
        
        {/* Wishlist Button */}
        <WishlistButtonFull 
          productId={product.id}
          variantId={selectedVariant?.id}
          className="flex-shrink-0"
        />
      </div>
    </div>
  )
}
```

### **2. Product Grid/List Integration**

```typescript
// In your product grid component
import { WishlistButtonCompact } from '@/components/ui/WishlistButton'

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map(product => (
        <div key={product.id} className="relative bg-white rounded-lg shadow-md overflow-hidden">
          {/* Product Image */}
          <div className="relative aspect-square">
            <Image src={product.image} alt={product.title} fill />
            
            {/* Wishlist Button - Positioned absolutely */}
            <WishlistButtonCompact 
              productId={product.id}
              className="absolute top-2 right-2"
            />
          </div>
          
          {/* Product Info */}
          <div className="p-4">
            <h3 className="font-medium">{product.title}</h3>
            <p className="text-lg font-bold">₦{product.price.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### **3. Navigation Integration**

```typescript
// Add wishlist count to navigation
import { useWishlist } from '@/hooks/useWishlist'

export default function Navigation() {
  const { count } = useWishlist()

  return (
    <nav className="flex items-center gap-4">
      {/* Other nav items */}
      
      <Link href="/account/wishlist" className="relative">
        <HeartIcon className="w-6 h-6" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {count}
          </span>
        )}
      </Link>
    </nav>
  )
}
```

## 📱 **Category Structure Integration Examples**

### **1. Category Navigation with Subcategories**

```typescript
// Enhanced category navigation
export default function CategoryNavigation() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    // Fetch hierarchical categories
    api('/api/categories?include_children=true')
      .then(setCategories)
  }, [])

  return (
    <nav className="category-nav">
      {categories.map(category => (
        <div key={category.id} className="category-group">
          <Link href={`/categories/${category.slug}`} className="main-category">
            {category.name}
          </Link>
          
          {category.children?.length > 0 && (
            <div className="subcategories">
              {category.children.map(subcategory => (
                <Link 
                  key={subcategory.id}
                  href={`/categories/${category.slug}/${subcategory.slug}`}
                  className="subcategory"
                >
                  {subcategory.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
```

### **2. Admin Product Creation with Subcategories**

```typescript
// Enhanced admin product form
export default function AdminProductForm() {
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [sizeOptions, setSizeOptions] = useState([])

  // Load categories and size options
  useEffect(() => {
    api('/api/admin/categories').then(setCategories)
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      api(`/api/admin/categories/${selectedCategory}/size-options`)
        .then(response => setSizeOptions(response.options))
    }
  }, [selectedCategory])

  return (
    <form className="product-form">
      {/* Category Selection */}
      <div className="form-group">
        <label>Category</label>
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Select Category</option>
          {categories.map(category => (
            <optgroup key={category.id} label={category.name}>
              {category.children?.map(subcategory => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Dynamic Size Selection */}
      {sizeOptions.length > 0 && (
        <div className="form-group">
          <label>Available Sizes</label>
          <div className="size-grid">
            {sizeOptions.map(size => (
              <label key={size.value} className="size-option">
                <input 
                  type="checkbox" 
                  value={size.value}
                  name="sizes"
                />
                {size.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}
```

## 🎨 **Size System Integration Examples**

### **1. Product Variant Selection with Dynamic Sizes**

```typescript
// Product page with dynamic size selection
export default function ProductSizes({ product }: { product: Product }) {
  const [sizeInfo, setSizeInfo] = useState(null)

  useEffect(() => {
    if (product.category_id) {
      api(`/api/admin/categories/${product.category_id}/size-options`)
        .then(setSizeInfo)
    }
  }, [product.category_id])

  return (
    <div className="size-selection">
      <h3 className="text-lg font-medium mb-3">
        Size ({sizeInfo?.size_type_label})
      </h3>
      
      <div className="size-grid">
        {product.variants.map(variant => (
          <button
            key={variant.id}
            className={`size-button ${variant.in_stock ? 'available' : 'unavailable'}`}
            disabled={!variant.in_stock}
          >
            {variant.size}
            {sizeInfo?.size_type === 'shoes' && (
              <span className="size-type">US</span>
            )}
          </button>
        ))}
      </div>
      
      {sizeInfo?.size_type === 'shoes' && (
        <div className="size-guide mt-2">
          <button className="text-sm text-maroon-600 hover:underline">
            Size Guide
          </button>
        </div>
      )}
    </div>
  )
}
```

### **2. Size Filter in Category Pages**

```typescript
// Category page with size filtering
export default function CategoryPage({ category }: { category: Category }) {
  const [sizeOptions, setSizeOptions] = useState([])
  const [selectedSizes, setSelectedSizes] = useState([])

  useEffect(() => {
    api(`/api/admin/categories/${category.id}/size-options`)
      .then(response => setSizeOptions(response.options))
  }, [category.id])

  return (
    <div className="category-page">
      <div className="filters">
        <div className="size-filter">
          <h3>Size</h3>
          {sizeOptions.map(size => (
            <label key={size.value} className="filter-option">
              <input
                type="checkbox"
                value={size.value}
                checked={selectedSizes.includes(size.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedSizes([...selectedSizes, size.value])
                  } else {
                    setSelectedSizes(selectedSizes.filter(s => s !== size.value))
                  }
                }}
              />
              {size.label}
            </label>
          ))}
        </div>
      </div>
      
      {/* Product grid with filtered results */}
    </div>
  )
}
```

## 🔄 **Migration and Deployment Steps**

### **1. Database Migration**

```bash
# Run the category migration script
python backend/scripts/migrate_categories.py

# Verify the migration
python backend/scripts/migrate_categories.py --verify
```

### **2. Frontend Integration**

```bash
# Install any new dependencies (if needed)
npm install

# Update existing product pages to include wishlist buttons
# Update category navigation to show subcategories
# Update admin forms to use dynamic size options
```

### **3. Testing Checklist**

- [ ] **Wishlist Functionality**
  - [ ] Add items to wishlist (authenticated users)
  - [ ] Remove items from wishlist
  - [ ] View wishlist page
  - [ ] Move items from wishlist to cart
  - [ ] Login prompt for unauthenticated users

- [ ] **Category Structure**
  - [ ] Navigate to subcategories
  - [ ] Filter products by subcategory
  - [ ] Admin can assign products to subcategories
  - [ ] Category hierarchy displays correctly

- [ ] **Size System**
  - [ ] Clothing products show clothing sizes
  - [ ] Shoe products show numeric sizes
  - [ ] Admin interface shows appropriate sizes
  - [ ] Size validation works correctly

### **4. Production Deployment**

1. **Backend Deployment**
   - Deploy updated models and API endpoints
   - Run database migration script
   - Verify API endpoints are working

2. **Frontend Deployment**
   - Deploy updated components and pages
   - Test wishlist functionality
   - Verify category navigation

3. **Post-Deployment Verification**
   - Test complete user journey
   - Verify admin functionality
   - Monitor for any errors

This integration provides a complete enhancement to the MDV e-commerce platform with improved user experience and better product organization.
