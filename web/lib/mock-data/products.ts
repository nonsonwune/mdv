import type { Product, Variant, ProductImage } from '../types'

// Nigerian fashion brands and designers
const nigerianBrands = [
  'Orange Culture', 'Lisa Folawiyo', 'Mai Atafo', 'Deola Sagoe', 'Tiffany Amber',
  'Kenneth Ize', 'Maki Oh', 'Tzar Studios', 'Emmy Kasbit', 'Style Temple',
  'Atafo', 'Fruché', 'Ejiro Amos Tafiri', 'Lanre Da Silva', 'Odio Mimonet'
]

// Product categories with Nigerian fashion context
const productCategories = {
  men: [
    { name: 'Agbada', description: 'Traditional Nigerian formal wear' },
    { name: 'Senator Wear', description: 'Modern traditional style' },
    { name: 'Dashiki', description: 'African print shirts' },
    { name: 'Native Wear', description: 'Traditional attire' },
    { name: 'Kaftan', description: 'Comfortable traditional wear' },
    { name: 'T-Shirts', description: 'Casual everyday wear' },
    { name: 'Jeans', description: 'Denim pants' },
    { name: 'Sneakers', description: 'Casual footwear' },
  ],
  women: [
    { name: 'Ankara Dress', description: 'African print dresses' },
    { name: 'Aso Ebi', description: 'Party and wedding attire' },
    { name: 'Gele', description: 'Traditional head wrap' },
    { name: 'Buba & Wrapper', description: 'Traditional two-piece' },
    { name: 'Maxi Dress', description: 'Long flowing dresses' },
    { name: 'Blazers', description: 'Professional wear' },
    { name: 'Skirts', description: 'Various styles' },
    { name: 'Heels', description: 'Formal footwear' },
  ],
  essentials: [
    { name: 'Face Masks', description: 'Protective face coverings' },
    { name: 'Hand Bags', description: 'Everyday bags' },
    { name: 'Jewelry', description: 'Accessories' },
    { name: 'Belts', description: 'Leather and fabric belts' },
    { name: 'Sunglasses', description: 'UV protection' },
    { name: 'Watches', description: 'Timepieces' },
    { name: 'Scarves', description: 'Fashion scarves' },
    { name: 'Wallets', description: 'Card holders and wallets' },
  ],
}

// Nigerian color preferences
const colors = [
  'Ankara Print', 'Kente Pattern', 'Adire Blue', 'Lagos Red', 
  'Black', 'White', 'Navy', 'Burgundy', 'Gold', 'Green',
  'Orange', 'Purple', 'Brown', 'Cream', 'Grey'
]

// Nigerian sizes
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

// Materials commonly used in Nigerian fashion
const materials = [
  'Ankara', 'Aso Oke', 'Lace', 'George Fabric', 'Cotton',
  'Silk', 'Chiffon', 'Satin', 'Velvet', 'Damask',
  'Adire', 'Kente', 'Leather', 'Suede', 'Denim'
]

// Generate random Nigerian names for reviews
const nigerianNames = [
  'Adaeze Okonkwo', 'Emeka Nwosu', 'Funke Adeyemi', 'Chidi Okafor',
  'Ngozi Eze', 'Tunde Bakare', 'Aisha Mohammed', 'Kemi Adeleke',
  'Bola Adesanya', 'Chioma Nnamani', 'Yemi Ogunleye', 'Zainab Ibrahim',
  'Segun Adebayo', 'Folake Olowu', 'Uche Igwe', 'Halima Suleiman'
]

// Generate price in Naira
function generatePrice(min: number = 5000, max: number = 150000): number {
  return Math.floor(Math.random() * (max - min) + min)
}

// Generate product images
function generateProductImages(productName: string, count: number = 4): ProductImage[] {
  const images: ProductImage[] = []
  for (let i = 0; i < count; i++) {
    images.push({
      id: `img-${Date.now()}-${i}`,
      url: `https://picsum.photos/seed/${productName}-${i}/800/1000`,
      alt_text: `${productName} - View ${i + 1}`,
      width: 800,
      height: 1000,
      is_primary: i === 0,
    })
  }
  return images
}

// Generate product variants
function generateVariants(basePrice: number, category: string): Variant[] {
  const variants: Variant[] = []
  const applicableSizes = category.includes('Shoes') || category.includes('Sneakers') || category.includes('Heels')
    ? ['38', '39', '40', '41', '42', '43', '44', '45']
    : sizes
  
  const selectedColors = colors.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1)
  const selectedSizes = applicableSizes.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 2)
  
  selectedColors.forEach((color, colorIndex) => {
    selectedSizes.forEach((size, sizeIndex) => {
      const priceVariation = Math.floor(Math.random() * 2000) - 1000
      const stockLevel = Math.floor(Math.random() * 50)
      
      variants.push({
        id: `var-${Date.now()}-${colorIndex}-${sizeIndex}`,
        sku: `SKU-${Date.now()}-${colorIndex}${sizeIndex}`,
        size,
        color,
        price: basePrice + priceVariation,
        compare_at_price: Math.random() > 0.3 ? basePrice + priceVariation + generatePrice(2000, 10000) : undefined,
        inventory_quantity: stockLevel,
        barcode: `${Date.now()}${colorIndex}${sizeIndex}`,
      })
    })
  })
  
  return variants
}

// Generate a single mock product
export function generateMockProduct(
  category: 'men' | 'women' | 'essentials',
  index: number
): Product {
  const categoryProducts = productCategories[category]
  const productType = categoryProducts[index % categoryProducts.length]
  const brand = nigerianBrands[Math.floor(Math.random() * nigerianBrands.length)]
  const material = materials[Math.floor(Math.random() * materials.length)]
  
  const basePrice = generatePrice()
  const productName = `${brand} ${productType.name}`
  const slug = productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  
  return {
    id: `prod-${Date.now()}-${index}`,
    title: productName,
    slug,
    description: `Premium ${productType.description} by ${brand}. Made from high-quality ${material}. Perfect for ${
      category === 'men' ? 'the modern Nigerian man' : 
      category === 'women' ? 'the elegant Nigerian woman' : 
      'everyday use'
    }. ${
      Math.random() > 0.5 ? 'Features traditional Nigerian patterns and designs.' : 'Contemporary style with African influences.'
    }`,
    vendor: brand,
    product_type: productType.name,
    tags: [category, productType.name, brand, material, 'Nigerian Fashion', 'African Style'],
    status: 'active',
    variants: generateVariants(basePrice, productType.name),
    images: generateProductImages(productName),
    options: [
      { name: 'Size', values: [...new Set(generateVariants(basePrice, productType.name).map(v => v.size!))] },
      { name: 'Color', values: [...new Set(generateVariants(basePrice, productType.name).map(v => v.color!))] },
    ],
    compare_at_price: Math.random() > 0.3 ? basePrice + generatePrice(5000, 20000) : undefined,
    created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

// Generate multiple mock products
export function generateMockProducts(
  count: number = 50,
  category?: 'men' | 'women' | 'essentials'
): Product[] {
  const products: Product[] = []
  const categories: ('men' | 'women' | 'essentials')[] = category 
    ? [category] 
    : ['men', 'women', 'essentials']
  
  for (let i = 0; i < count; i++) {
    const selectedCategory = categories[i % categories.length]
    products.push(generateMockProduct(selectedCategory, i))
  }
  
  return products
}

// Get featured products
export function getFeaturedProducts(): Product[] {
  return generateMockProducts(8).map(product => ({
    ...product,
    tags: [...(product.tags || []), 'Featured'],
  }))
}

// Get products on sale
export function getSaleProducts(): Product[] {
  return generateMockProducts(12).map(product => {
    const salePrice = Math.floor(product.variants![0].price! * 0.7)
    return {
      ...product,
      tags: [...(product.tags || []), 'Sale'],
      variants: product.variants?.map(v => ({
        ...v,
        compare_at_price: v.price,
        price: salePrice,
      })),
    }
  })
}

// Search products
export function searchMockProducts(query: string, products: Product[]): Product[] {
  const searchTerm = query.toLowerCase()
  return products.filter(product => 
    product.title?.toLowerCase().includes(searchTerm) ||
    product.description?.toLowerCase().includes(searchTerm) ||
    product.vendor?.toLowerCase().includes(searchTerm) ||
    product.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  )
}

// Filter products
export function filterMockProducts(
  products: Product[],
  filters: {
    category?: string
    minPrice?: number
    maxPrice?: number
    sizes?: string[]
    colors?: string[]
    brands?: string[]
    inStock?: boolean
  }
): Product[] {
  return products.filter(product => {
    // Category filter
    if (filters.category && !product.tags?.includes(filters.category)) {
      return false
    }
    
    // Price filter
    const productPrice = product.variants?.[0]?.price || 0
    if (filters.minPrice && productPrice < filters.minPrice) {
      return false
    }
    if (filters.maxPrice && productPrice > filters.maxPrice) {
      return false
    }
    
    // Size filter
    if (filters.sizes && filters.sizes.length > 0) {
      const productSizes = product.variants?.map(v => v.size).filter(Boolean) || []
      if (!filters.sizes.some(size => productSizes.includes(size))) {
        return false
      }
    }
    
    // Color filter
    if (filters.colors && filters.colors.length > 0) {
      const productColors = product.variants?.map(v => v.color).filter(Boolean) || []
      if (!filters.colors.some(color => productColors.includes(color))) {
        return false
      }
    }
    
    // Brand filter
    if (filters.brands && filters.brands.length > 0) {
      if (!filters.brands.includes(product.vendor || '')) {
        return false
      }
    }
    
    // Stock filter
    if (filters.inStock) {
      const hasStock = product.variants?.some(v => (v.inventory_quantity || 0) > 0)
      if (!hasStock) {
        return false
      }
    }
    
    return true
  })
}

// Get product recommendations
export function getProductRecommendations(product: Product, allProducts: Product[]): Product[] {
  // Get products from same category or brand
  const recommendations = allProducts.filter(p => 
    p.id !== product.id && (
      p.product_type === product.product_type ||
      p.vendor === product.vendor ||
      p.tags?.some(tag => product.tags?.includes(tag))
    )
  )
  
  // Shuffle and return top 4
  return recommendations
    .sort(() => 0.5 - Math.random())
    .slice(0, 4)
}

// Export all mock data
export const mockProductData = {
  allProducts: generateMockProducts(100),
  featuredProducts: getFeaturedProducts(),
  saleProducts: getSaleProducts(),
  categories: productCategories,
  brands: nigerianBrands,
  colors,
  sizes,
  materials,
}
