# Component API Reference

Complete API documentation for all MDV platform components.

## Table of Contents

- [UI Components](#ui-components)
- [Product Components](#product-components)
- [Cart Components](#cart-components)
- [Checkout Components](#checkout-components)
- [Account Components](#account-components)
- [Search Components](#search-components)
- [Feature Components](#feature-components)

---

## UI Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui/Button';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `disabled` | `boolean` | `false` | Disable button |
| `loading` | `boolean` | `false` | Show loading spinner |
| `fullWidth` | `boolean` | `false` | Full width button |
| `onClick` | `() => void` | - | Click handler |
| `children` | `ReactNode` | - | Button content |
| `className` | `string` | - | Additional CSS classes |

#### Examples

```tsx
// Primary button
<Button variant="primary" onClick={handleClick}>
  Submit
</Button>

// Loading state
<Button loading={true}>
  Processing...
</Button>

// Full width
<Button fullWidth variant="secondary">
  Continue Shopping
</Button>
```

---

### Card

Container component with optional shadow and padding.

```tsx
import { Card } from '@/components/ui/Card';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Card content |
| `className` | `string` | - | Additional CSS classes |
| `shadow` | `boolean` | `true` | Show shadow |
| `padding` | `boolean` | `true` | Add padding |
| `hoverable` | `boolean` | `false` | Add hover effect |

#### Examples

```tsx
<Card shadow={true} padding={true}>
  <h2>Card Title</h2>
  <p>Card content</p>
</Card>
```

---

### Modal

Overlay dialog component with header, body, and footer sections.

```tsx
import { Modal } from '@/components/ui/Modal';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Control modal visibility |
| `onClose` | `() => void` | - | Close handler |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Modal size |
| `title` | `string` | - | Modal title |
| `children` | `ReactNode` | - | Modal content |
| `closeOnOverlay` | `boolean` | `true` | Close on overlay click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |

#### Examples

```tsx
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Product Details">
  <Modal.Body>
    <p>Product information here</p>
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={() => setIsOpen(false)}>Close</Button>
  </Modal.Footer>
</Modal>
```

---

### Badge

Small status indicators and labels.

```tsx
import { Badge } from '@/components/ui/Badge';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'default'` | Badge style |
| `size` | `'sm' \| 'md'` | `'md'` | Badge size |
| `children` | `ReactNode` | - | Badge content |

#### Examples

```tsx
<Badge variant="success">In Stock</Badge>
<Badge variant="warning" size="sm">Low Stock</Badge>
<Badge variant="error">Out of Stock</Badge>
```

---

### Input

Form input component with validation support.

```tsx
import { Input } from '@/components/ui/Input';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `string` | `'text'` | Input type |
| `label` | `string` | - | Input label |
| `placeholder` | `string` | - | Placeholder text |
| `value` | `string` | - | Input value |
| `onChange` | `(value: string) => void` | - | Change handler |
| `error` | `string` | - | Error message |
| `required` | `boolean` | `false` | Required field |
| `disabled` | `boolean` | `false` | Disable input |

#### Examples

```tsx
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={setEmail}
  error={errors.email}
  required
/>
```

---

## Product Components

### ProductCard

Display product information in a card format.

```tsx
import { ProductCard } from '@/components/product/ProductCard';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `product` | `Product` | - | Product data |
| `view` | `'grid' \| 'list'` | `'grid'` | Display view |
| `showQuickView` | `boolean` | `true` | Show quick view button |
| `showWishlist` | `boolean` | `true` | Show wishlist button |
| `onAddToCart` | `(product: Product) => void` | - | Add to cart handler |
| `onQuickView` | `(product: Product) => void` | - | Quick view handler |

#### Product Type

```tsx
interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  description?: string;
  inStock?: boolean;
  badge?: string;
}
```

#### Examples

```tsx
<ProductCard
  product={product}
  view="grid"
  onAddToCart={handleAddToCart}
  onQuickView={handleQuickView}
/>
```

---

### ProductGallery

Image gallery with zoom and thumbnail navigation.

```tsx
import { ProductGallery } from '@/components/product/ProductGallery';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `string[]` | - | Array of image URLs |
| `productName` | `string` | - | Product name for alt text |
| `showZoom` | `boolean` | `true` | Enable zoom feature |
| `showThumbnails` | `boolean` | `true` | Show thumbnail navigation |
| `autoPlay` | `boolean` | `false` | Auto-rotate images |

#### Examples

```tsx
<ProductGallery
  images={['/img1.jpg', '/img2.jpg', '/img3.jpg']}
  productName="Premium T-Shirt"
  showZoom={true}
/>
```

---

### ProductVariants

Variant selector for size, color, and other options.

```tsx
import { ProductVariants } from '@/components/product/ProductVariants';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variants` | `Variant[]` | - | Available variants |
| `selectedVariant` | `Variant` | - | Currently selected variant |
| `onVariantChange` | `(variant: Variant) => void` | - | Selection handler |
| `type` | `'size' \| 'color' \| 'style'` | - | Variant type |

#### Variant Type

```tsx
interface Variant {
  id: string;
  name: string;
  value: string;
  available: boolean;
  price?: number;
  image?: string;
}
```

---

## Cart Components

### CartDrawer

Slide-out cart panel with full cart management.

```tsx
import { CartDrawer } from '@/components/cart/CartDrawer';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Control drawer visibility |
| `onClose` | `() => void` | - | Close handler |
| `cartItems` | `CartItem[]` | - | Cart items |
| `onUpdateQuantity` | `(id: string, quantity: number) => void` | - | Update quantity |
| `onRemoveItem` | `(id: string) => void` | - | Remove item |
| `onCheckout` | `() => void` | - | Proceed to checkout |

---

### CartItem

Individual cart item display.

```tsx
import { CartItem } from '@/components/cart/CartItem';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | `CartItemType` | - | Cart item data |
| `onUpdateQuantity` | `(quantity: number) => void` | - | Update quantity |
| `onRemove` | `() => void` | - | Remove item |
| `editable` | `boolean` | `true` | Allow editing |

---

## Checkout Components

### CheckoutSteps

Multi-step checkout progress indicator.

```tsx
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentStep` | `number` | - | Current step (1-based) |
| `steps` | `string[]` | - | Step labels |
| `onStepClick` | `(step: number) => void` | - | Step click handler |
| `allowStepClick` | `boolean` | `false` | Allow clicking previous steps |

---

### AddressForm

Address input form with validation.

```tsx
import { AddressForm } from '@/components/checkout/AddressForm';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `address` | `Address` | - | Initial address data |
| `onSubmit` | `(address: Address) => void` | - | Submit handler |
| `onCancel` | `() => void` | - | Cancel handler |
| `showSaveOption` | `boolean` | `true` | Show save address option |

---

### PaymentForm

Payment method selection and input.

```tsx
import { PaymentForm } from '@/components/checkout/PaymentForm';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSubmit` | `(payment: PaymentData) => void` | - | Submit handler |
| `savedCards` | `SavedCard[]` | - | Saved payment methods |
| `allowSave` | `boolean` | `true` | Allow saving payment method |

---

## Account Components

### UserProfile

User profile display and edit form.

```tsx
import { UserProfile } from '@/components/account/UserProfile';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `User` | - | User data |
| `onUpdate` | `(user: User) => void` | - | Update handler |
| `editable` | `boolean` | `true` | Allow editing |
| `showAvatar` | `boolean` | `true` | Show avatar upload |

---

### OrderHistory

Display user's order history with filtering.

```tsx
import { OrderHistory } from '@/components/account/OrderHistory';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orders` | `Order[]` | - | Order list |
| `onViewOrder` | `(order: Order) => void` | - | View order details |
| `onReorder` | `(order: Order) => void` | - | Reorder items |
| `showFilters` | `boolean` | `true` | Show filter options |

---

### LoyaltyProgram

Loyalty points and rewards display.

```tsx
import { LoyaltyProgram } from '@/components/account/LoyaltyProgram';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `points` | `number` | - | Current points |
| `tier` | `string` | - | Current tier |
| `rewards` | `Reward[]` | - | Available rewards |
| `history` | `PointHistory[]` | - | Points history |
| `onRedeemReward` | `(reward: Reward) => void` | - | Redeem reward |

---

## Search Components

### SearchBar

Smart search bar with autocomplete.

```tsx
import { SearchBar } from '@/components/search/SearchBar';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSearch` | `(query: string) => void` | - | Search handler |
| `suggestions` | `string[]` | - | Autocomplete suggestions |
| `recentSearches` | `string[]` | - | Recent search history |
| `placeholder` | `string` | `'Search...'` | Placeholder text |
| `showTrending` | `boolean` | `true` | Show trending searches |
| `autoFocus` | `boolean` | `false` | Auto-focus on mount |

#### Examples

```tsx
<SearchBar
  onSearch={handleSearch}
  suggestions={searchSuggestions}
  recentSearches={recentSearches}
  showTrending={true}
/>
```

---

### AdvancedFilters

Comprehensive filter panel for search results.

```tsx
import { AdvancedFilters } from '@/components/search/AdvancedFilters';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | `FilterState` | - | Current filter state |
| `onFiltersChange` | `(filters: FilterState) => void` | - | Filter change handler |
| `categories` | `Category[]` | - | Available categories |
| `brands` | `string[]` | - | Available brands |
| `showPriceRange` | `boolean` | `true` | Show price filter |
| `showRatings` | `boolean` | `true` | Show ratings filter |

#### FilterState Type

```tsx
interface FilterState {
  categories: string[];
  brands: string[];
  priceRange: { min: number; max: number };
  sizes: string[];
  colors: string[];
  rating: number;
  inStock: boolean;
}
```

---

### SearchResults

Display search results with sorting and view options.

```tsx
import { SearchResults } from '@/components/search/SearchResults';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `results` | `Product[]` | - | Search results |
| `totalResults` | `number` | - | Total result count |
| `view` | `'grid' \| 'list'` | `'grid'` | Display view |
| `sortBy` | `string` | - | Sort option |
| `onViewChange` | `(view: string) => void` | - | View change handler |
| `onSortChange` | `(sort: string) => void` | - | Sort change handler |
| `loading` | `boolean` | `false` | Loading state |

---

## Feature Components

### VirtualTryOn

Virtual try-on with photo upload and overlay.

```tsx
import { VirtualTryOn } from '@/components/features/VirtualTryOn';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `product` | `Product` | - | Product to try on |
| `onSizeRecommendation` | `(size: string) => void` | - | Size recommendation callback |
| `showMeasurements` | `boolean` | `true` | Show measurement inputs |
| `allowPhotoUpload` | `boolean` | `true` | Allow photo upload |

#### Examples

```tsx
<VirtualTryOn
  product={selectedProduct}
  onSizeRecommendation={(size) => setRecommendedSize(size)}
  showMeasurements={true}
/>
```

---

### SizeRecommendation

AI-powered size recommendation system.

```tsx
import { SizeRecommendation } from '@/components/features/SizeRecommendation';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `product` | `Product` | - | Product for sizing |
| `userMeasurements` | `Measurements` | - | User measurements |
| `onSelectSize` | `(size: string) => void` | - | Size selection handler |
| `showComparison` | `boolean` | `true` | Show brand comparison |
| `showFitProfile` | `boolean` | `true` | Show fit preferences |

#### Measurements Type

```tsx
interface Measurements {
  height: number;
  weight: number;
  chest?: number;
  waist?: number;
  hips?: number;
  shoeSize?: number;
}
```

---

### GiftRegistry

Gift registry management system.

```tsx
import { GiftRegistry } from '@/components/features/GiftRegistry';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `registry` | `Registry` | - | Registry data |
| `onAddItem` | `(item: Product) => void` | - | Add item handler |
| `onRemoveItem` | `(itemId: string) => void` | - | Remove item handler |
| `onShare` | `() => void` | - | Share registry handler |
| `isOwner` | `boolean` | `false` | Is current user the owner |
| `allowContribution` | `boolean` | `true` | Allow contributions |

#### Registry Type

```tsx
interface Registry {
  id: string;
  name: string;
  eventDate: Date;
  description: string;
  items: RegistryItem[];
  shippingAddress: Address;
  isPublic: boolean;
  shareCode: string;
}
```

---

## Hooks

### useCart

Cart management hook.

```tsx
import { useCart } from '@/hooks/useCart';
```

#### Returns

```tsx
{
  items: CartItem[];
  total: number;
  count: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => void;
}
```

---

### useWishlist

Wishlist management hook.

```tsx
import { useWishlist } from '@/hooks/useWishlist';
```

#### Returns

```tsx
{
  items: Product[];
  count: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  moveToCart: (productId: string) => void;
  clearWishlist: () => void;
}
```

---

### useAuth

Authentication hook.

```tsx
import { useAuth } from '@/hooks/useAuth';
```

#### Returns

```tsx
{
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

---

## Utility Types

### Common Types

```tsx
// Product
interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  description?: string;
  category?: string;
  brand?: string;
  rating?: number;
  reviews?: number;
  inStock?: boolean;
  variants?: Variant[];
}

// User
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  addresses?: Address[];
  measurements?: Measurements;
  preferences?: UserPreferences;
}

// Order
interface Order {
  id: string;
  orderNumber: string;
  date: Date;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: Address;
  billingAddress: Address;
  payment: PaymentInfo;
}

// Address
interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}
```

---

## Best Practices

### Component Usage

1. **Always provide required props**: Ensure all required props are passed to components
2. **Use TypeScript**: Leverage TypeScript for type safety
3. **Handle loading states**: Show appropriate loading indicators
4. **Error handling**: Implement proper error boundaries and fallbacks
5. **Accessibility**: Ensure all interactive elements are keyboard accessible

### Performance

1. **Lazy load components**: Use dynamic imports for heavy components
2. **Memoize expensive computations**: Use `useMemo` and `useCallback`
3. **Optimize images**: Use Next.js Image component
4. **Debounce user input**: Debounce search and filter operations

### Styling

1. **Use Tailwind classes**: Leverage utility classes for consistency
2. **Responsive design**: Test on multiple screen sizes
3. **Dark mode support**: Consider dark mode variants
4. **Custom themes**: Use CSS variables for theming

---

## Migration Guide

### From v1 to v2

```tsx
// v1
<Button type="primary">Click</Button>

// v2
<Button variant="primary">Click</Button>

// v1
<ProductCard 
  product={product}
  showCart={true}
/>

// v2
<ProductCard
  product={product}
  onAddToCart={handleAddToCart}
/>
```

---

## Support

For questions and issues:
- Check the [Getting Started Guide](./GETTING_STARTED.md)
- Review [examples](./examples)
- Open an issue on GitHub
- Contact support@mdv.com
