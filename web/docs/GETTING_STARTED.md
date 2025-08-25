# Getting Started with MDV E-Commerce Platform

Welcome to the MDV e-commerce platform! This guide will help you get up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: Version 18.0 or higher
- **npm/yarn/pnpm**: Package manager of your choice
- **Git**: For version control
- **Code Editor**: VS Code recommended

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/mdv.git
cd mdv/web

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see your application running.

## Project Overview

### Key Technologies
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React 18**: UI library with hooks

### Directory Structure

```
web/
├── app/              # Pages and routes
├── components/       # Reusable components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and helpers
├── styles/          # Global styles
└── public/          # Static assets
```

## Development Workflow

### 1. Creating New Components

Components are organized by feature. Create new components in the appropriate directory:

```tsx
// components/product/NewFeature.tsx
import React from 'react';

interface NewFeatureProps {
  title: string;
}

export const NewFeature: React.FC<NewFeatureProps> = ({ title }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
};
```

### 2. Adding New Pages

Create pages in the `app` directory following Next.js conventions:

```tsx
// app/new-page/page.tsx
export default function NewPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1>New Page</h1>
    </main>
  );
}
```

### 3. Using Existing Components

Import and use components from the library:

```tsx
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/product/ProductCard';
import { SearchBar } from '@/components/search/SearchBar';

export default function Example() {
  return (
    <div>
      <SearchBar onSearch={(query) => console.log(query)} />
      <ProductCard product={mockProduct} />
      <Button variant="primary">Click Me</Button>
    </div>
  );
}
```

## Component Library

### UI Components

#### Button
```tsx
<Button 
  variant="primary|secondary|outline|ghost" 
  size="sm|md|lg"
  onClick={() => {}}
>
  Click Me
</Button>
```

#### Card
```tsx
<Card className="p-6">
  <h2>Card Title</h2>
  <p>Card content</p>
</Card>
```

#### Modal
```tsx
<Modal isOpen={true} onClose={() => {}}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <Button>Action</Button>
  </Modal.Footer>
</Modal>
```

### Product Components

#### ProductCard
```tsx
<ProductCard 
  product={{
    id: '1',
    name: 'Product Name',
    price: 99.99,
    image: '/product.jpg'
  }}
  onAddToCart={(product) => {}}
/>
```

#### ProductGallery
```tsx
<ProductGallery 
  images={['/img1.jpg', '/img2.jpg']}
  productName="Product"
/>
```

### Cart Components

#### CartDrawer
```tsx
<CartDrawer 
  isOpen={true}
  onClose={() => {}}
  cartItems={[]}
/>
```

### Search Components

#### SearchBar
```tsx
<SearchBar 
  onSearch={(query) => console.log(query)}
  suggestions={['suggestion1', 'suggestion2']}
/>
```

#### AdvancedFilters
```tsx
<AdvancedFilters 
  onFiltersChange={(filters) => console.log(filters)}
/>
```

## State Management

### Using Cart Hook
```tsx
import { useCart } from '@/hooks/useCart';

function Component() {
  const { items, addItem, removeItem, total } = useCart();
  
  return (
    <div>
      <p>Total: ${total}</p>
      <button onClick={() => addItem(product)}>Add to Cart</button>
    </div>
  );
}
```

### Using Wishlist Hook
```tsx
import { useWishlist } from '@/hooks/useWishlist';

function Component() {
  const { items, addItem, removeItem } = useWishlist();
  
  return (
    <button onClick={() => addItem(product)}>
      Add to Wishlist
    </button>
  );
}
```

## Styling Guide

### Using Tailwind Classes
```tsx
// Responsive design
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-xl md:text-2xl lg:text-3xl">Title</h1>
</div>

// Hover and focus states
<button className="bg-maroon-600 hover:bg-maroon-700 focus:ring-2">
  Button
</button>

// Dark mode (if enabled)
<div className="bg-white dark:bg-gray-800">
  Content
</div>
```

### Custom Colors
The project uses a custom maroon color palette:
- `maroon-50` to `maroon-900`
- Primary: `maroon-600`
- Hover: `maroon-700`
- Light: `maroon-100`

## Mock Data

Mock data is available for development:

```tsx
import { mockProducts } from '@/lib/mockData';
import { mockUser } from '@/lib/mockData';
import { mockOrders } from '@/lib/mockData';

// Use in components
<ProductCard product={mockProducts[0]} />
```

## Environment Variables

Create a `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=MDV Store

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Features Flags (optional)
NEXT_PUBLIC_ENABLE_VIRTUAL_TRYON=true
NEXT_PUBLIC_ENABLE_SIZE_RECOMMENDATION=true
```

## Common Tasks

### Adding a New Product Feature

1. Create component in `components/product/`
2. Add types in `lib/types.ts`
3. Import and use in pages
4. Add mock data if needed

### Implementing API Integration

```tsx
// lib/api.ts
export async function fetchProducts() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
  return response.json();
}

// In component
useEffect(() => {
  fetchProducts().then(setProducts);
}, []);
```

### Adding Form Validation

```tsx
const [errors, setErrors] = useState({});

const validate = (values) => {
  const errors = {};
  if (!values.email) errors.email = 'Required';
  if (!values.password) errors.password = 'Required';
  return errors;
};

const handleSubmit = (e) => {
  e.preventDefault();
  const validationErrors = validate(formData);
  if (Object.keys(validationErrors).length === 0) {
    // Submit form
  } else {
    setErrors(validationErrors);
  }
};
```

## Testing

### Running Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### Writing Tests
```tsx
// __tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

## Debugging

### Browser DevTools
- React Developer Tools
- Redux DevTools (if using Redux)
- Network tab for API calls

### Console Debugging
```tsx
console.log('Component rendered', { props, state });
console.table(data);
console.time('Performance');
// ... code
console.timeEnd('Performance');
```

### VS Code Debugging
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Next.js",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Run with: `npm run dev -- --inspect`

## Performance Tips

### Image Optimization
```tsx
import Image from 'next/image';

<Image 
  src="/product.jpg"
  alt="Product"
  width={400}
  height={400}
  loading="lazy"
  placeholder="blur"
/>
```

### Code Splitting
```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
```

### Memoization
```tsx
import { useMemo, useCallback } from 'react';

const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

## Deployment Checklist

- [ ] Run type checking: `npm run type-check`
- [ ] Run tests: `npm run test`
- [ ] Build locally: `npm run build`
- [ ] Check bundle size: `npm run analyze`
- [ ] Update environment variables
- [ ] Test production build: `npm run start`
- [ ] Review console for errors
- [ ] Test on multiple browsers
- [ ] Check mobile responsiveness
- [ ] Verify API endpoints

## Troubleshooting

### Common Issues

#### Module not found
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

#### TypeScript errors
```bash
# Check types
npm run type-check

# Generate types
npm run generate-types
```

#### Styling issues
```bash
# Rebuild Tailwind
npm run build-css
```

#### Port already in use
```bash
# Change port
PORT=3001 npm run dev
```

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Community
- GitHub Issues
- Discord Server
- Stack Overflow

### Learning Path
1. Start with UI components
2. Build a simple page
3. Add interactivity with hooks
4. Integrate with API
5. Deploy to production

## Next Steps

1. Explore the component library
2. Build a custom page
3. Integrate with your backend
4. Customize the theme
5. Deploy to production

Happy coding! 🚀
