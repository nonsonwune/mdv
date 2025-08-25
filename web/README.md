# MDV - Modern E-Commerce Platform

A comprehensive, production-ready e-commerce platform built with Next.js 14, TypeScript, and Tailwind CSS. Features a complete shopping experience with advanced product discovery, user accounts, virtual try-on, and more.

## 🚀 Features

### Phase 1: Core Components ✅
- **Product Listing**: Grid/list views with filtering and sorting
- **Product Details**: Image galleries, variant selection, size guides
- **Shopping Cart**: Real-time updates, quantity management, promotions
- **Wishlist**: Save favorites, move to cart functionality
- **Checkout Flow**: Multi-step process with validation

### Phase 2: Enhanced Product Features ✅
- **Product Variants**: Size, color, and style selection
- **Image Gallery**: Zoom, thumbnails, and lightbox views
- **Product Recommendations**: Related and frequently bought together
- **Quick View**: Modal-based product preview
- **Comparison Tool**: Side-by-side product comparison
- **Collections**: Curated product groupings

### Phase 3: Cart & Checkout Enhancements ✅
- **Cart Drawer**: Slide-out cart with full management
- **Multi-step Checkout**: Address, payment, review steps
- **Order Summary**: Detailed pricing breakdown
- **Address Management**: Multiple addresses with validation
- **Payment Methods**: Card management and selection
- **Order Confirmation**: Detailed confirmation page

### Phase 4: User Account & Dashboard ✅
- **User Profile**: Personal information management
- **Order History**: Track past and current orders
- **User Dashboard**: Stats, quick actions, recommendations
- **Account Settings**: Privacy, security, notifications
- **Loyalty Program**: Points, tiers, and rewards
- **Reviews & Ratings**: Product review system
- **Notification Center**: Centralized notification hub

### Phase 5: Search & Discovery ✅
- **Smart Search Bar**: Autocomplete with suggestions
- **Advanced Filters**: Multi-dimensional filtering
- **Search Results**: Grid/list views with sorting
- **Recent Searches**: History tracking
- **Trending Searches**: Popular search terms
- **Visual Filters**: Color swatches, size selectors

### Phase 6: Additional Features ✅
- **Virtual Try-On**: Photo upload with overlay system
- **Size Recommendation**: AI-powered size suggestions
- **Gift Registry**: Event-based gift management

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + Context
- **Data Persistence**: LocalStorage
- **Image Optimization**: Next.js Image component
- **Forms**: Native HTML5 with validation
- **Icons**: Heroicons (inline SVG)

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mdv.git
cd mdv/web
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Create environment variables:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Project Structure

```
web/
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── shop/              # Shop pages
│   ├── product/           # Product pages
│   ├── cart/              # Cart page
│   ├── checkout/          # Checkout flow
│   ├── account/           # User account pages
│   └── search/            # Search results
│
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   │
│   ├── product/          # Product components
│   │   ├── ProductCard.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── ProductVariants.tsx
│   │   └── ...
│   │
│   ├── cart/             # Cart components
│   │   ├── CartDrawer.tsx
│   │   ├── CartItem.tsx
│   │   └── OrderSummary.tsx
│   │
│   ├── checkout/         # Checkout components
│   │   ├── CheckoutSteps.tsx
│   │   ├── AddressForm.tsx
│   │   └── PaymentForm.tsx
│   │
│   ├── account/          # Account components
│   │   ├── UserProfile.tsx
│   │   ├── OrderHistory.tsx
│   │   ├── LoyaltyProgram.tsx
│   │   └── ...
│   │
│   ├── search/           # Search components
│   │   ├── SearchBar.tsx
│   │   ├── AdvancedFilters.tsx
│   │   └── SearchResults.tsx
│   │
│   └── features/         # Additional features
│       ├── VirtualTryOn.tsx
│       ├── SizeRecommendation.tsx
│       └── GiftRegistry.tsx
│
├── hooks/                # Custom React hooks
│   ├── useCart.ts
│   ├── useWishlist.ts
│   └── useAuth.ts
│
├── lib/                  # Utility functions
│   ├── api.ts           # API client
│   ├── cart.ts          # Cart utilities
│   ├── format.ts        # Formatting utilities
│   └── types.ts         # TypeScript types
│
├── styles/              # Global styles
│   └── globals.css      # Tailwind directives
│
└── public/              # Static assets
    ├── images/
    └── fonts/
```

## 🎨 UI Components

### Core UI Components
- **Button**: Multiple variants (primary, secondary, outline, ghost)
- **Card**: Container component with shadow and padding options
- **Modal**: Overlay dialogs with size variants
- **Badge**: Status indicators and labels
- **Input/TextArea**: Form controls with validation
- **Select**: Dropdown selection component
- **Toggle**: Switch component for settings
- **Toast**: Notification messages
- **EmptyState**: Placeholder for empty content
- **ProgressBar**: Visual progress indicator

## 🔧 Configuration

### Tailwind Configuration
The project uses a custom Tailwind configuration with:
- Custom color palette (maroon brand colors)
- Extended spacing and sizing
- Custom animations
- Responsive breakpoints

### TypeScript Configuration
- Strict mode enabled
- Path aliases configured
- Next.js types included

## 📱 Responsive Design

All components are fully responsive with breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 🚦 State Management

### Cart State
- Global cart context
- LocalStorage persistence
- Real-time updates
- Quantity management
- Promo code application

### Wishlist State
- LocalStorage backed
- Add/remove items
- Move to cart functionality

### User State
- Profile information
- Measurements
- Preferences
- Order history

## 🔐 Security Features

- Input validation
- XSS protection
- CSRF tokens (production)
- Secure localStorage usage
- Privacy-first photo processing

## 🎯 Performance Optimizations

- Next.js Image optimization
- Lazy loading
- Code splitting
- Debounced search
- Virtual scrolling (large lists)
- LocalStorage caching

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run type checking
npm run type-check
```

## 📈 Analytics Integration

Ready for integration with:
- Google Analytics
- Facebook Pixel
- Custom tracking events

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Docker
```bash
docker build -t mdv-web .
docker run -p 3000:3000 mdv-web
```

### Traditional Hosting
```bash
npm run build
npm run start
```

## 📝 Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.mdv.com
NEXT_PUBLIC_SITE_URL=https://mdv.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/mdv/issues)
- Email: support@mdv.com

## 🎉 Acknowledgments

- Next.js team for the amazing framework
- Vercel for hosting
- Tailwind CSS for the utility-first CSS framework
- All contributors and users

---

Built with ❤️ by the MDV Team
