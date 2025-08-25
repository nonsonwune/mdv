1. P0-1: Repository Audit & Gap Analysis ✅ COMPLETED
**Tasks:**
- ✅ Review entire codebase structure and `docs/` folder contents
- ✅ Analyze existing components, pages, and API integrations
- ✅ Document missing features, components, and integrations
- ✅ Create `docs/gaps-analysis.md` with findings

**Files to Create/Modify:**
- ✅ `docs/gaps-analysis.md`
- ✅ `docs/mvp-checklist.md`

**Acceptance Criteria:**
- ✅ Complete inventory of existing vs. required components
- ✅ Clear list of missing UI elements (modals, forms, etc.)
- ✅ Documented backend touchpoints needing contracts
2. P0-2: Define Backend API Contracts ✅ COMPLETED
**Tasks:**
- ✅ Document all backend endpoints from worker/backend code
- ✅ Create OpenAPI/Swagger specification for APIs
- ✅ Define TypeScript interfaces for request/response types
- ✅ Set up API client with proper error handling

**Files to Create/Modify:**
- ✅ `docs/api-contracts.yaml` (OpenAPI spec)
- ✅ `web/lib/api-types.ts` (TypeScript interfaces)
- ✅ `web/lib/api-client.ts` (centralized API client)
- ✅ `web/lib/api.ts` (endpoint constants)

**Backend Touchpoints:**
- ✅ Product catalog API
- ✅ User authentication/registration (auth endpoint created)
- ✅ Cart management
- ✅ Order creation/management
- ✅ Payment processing
- ⚠️ User profile/settings (partial - admin only)

**Acceptance Criteria:**
- ✅ Complete API documentation in OpenAPI format
- ✅ Type-safe API client implementation
- ✅ Mock data aligns with actual backend schemas
3. P0-3: Core UI Components & Design System ✅ COMPLETED
**Tasks:**
- ✅ Implement missing base components
- ✅ Create reusable modal system (QuickViewModal, MiniCart)
- ✅ Build form components with validation
- ✅ Implement loading states and error boundaries
- ✅ Create toast/notification system

**Files to Create/Modify:**
- ✅ `web/app/_components/QuickViewModal.tsx`
- ✅ `web/app/_components/ToastProvider.tsx`
- ✅ `web/app/_components/ProductSkeleton.tsx`
- ✅ `web/app/_components/CartSkeleton.tsx`
- ✅ `web/app/_components/CheckoutSkeleton.tsx`
- ✅ `web/app/error.tsx`
- ✅ Form inputs in checkout pages
- ✅ `web/app/layout.tsx` (Header/Footer integrated)
- ✅ `web/app/_components/MiniCart.tsx`
- ✅ Toast hooks in ToastProvider

**Acceptance Criteria:**
- ✅ All UI components follow consistent design patterns
- ✅ Components are fully typed with TypeScript
- ⚠️ Accessibility standards met (partial)
- ❌ Storybook stories for component documentation
4. P0-4: Product Catalog & Shopping Cart ✅ COMPLETED
**Tasks:**
- ✅ Complete product listing page with filters/search
- ✅ Implement product detail page with image gallery
- ✅ Build shopping cart with add/remove/update quantities
- ✅ Create cart persistence (localStorage + backend sync)
- ✅ Implement quick-view modal for products

**Files to Create/Modify:**
- ✅ `web/app/page.tsx` (product listing)
- ✅ `web/app/product/[slug]/page.tsx`
- ✅ `web/app/_components/ProductCard.tsx`
- ✅ Basic sorting implemented
- ✅ Product images with gallery support
- ✅ `web/app/_components/QuickViewModal.tsx`
- ✅ `web/app/_components/MiniCart.tsx`
- ✅ `web/app/cart/page.tsx`
- ✅ `web/lib/cart.ts` (cart utilities)
- ✅ Cart recovery on 404

**Backend Touchpoints:**
- ✅ GET /api/products (with pagination, filters)
- ✅ GET /api/products/{id}
- ✅ POST /api/cart
- ✅ POST /api/cart/{id}/items
- ✅ PUT /api/cart/{id}/items/{itemId}
- ✅ DELETE /api/cart/{id}/items/{itemId}
- ✅ POST /api/cart/{id}/clear

**Acceptance Criteria:**
- ✅ Products load with proper pagination
- ✅ Cart state persists across sessions
- ✅ Real-time cart updates in UI
- ✅ Mobile-responsive design
5. P0-5: Paystack Checkout Integration ✅ COMPLETED
**Tasks:**
- ✅ Implement Paystack mock service for development
- ✅ Create environment toggle for mock/production Paystack
- ✅ Build multi-step checkout flow
- ✅ Implement payment confirmation and receipt pages
- ✅ Add order tracking functionality

**Files to Create/Modify:**
- ✅ `web/app/paystack-mock/page.tsx`
- ✅ `web/app/api/paystack/mock/route.ts` (REMOVED: replaced with backend-only mock)
- ✅ `web/app/checkout/page.tsx`
- ✅ Shipping integrated in checkout
- ✅ Payment integrated in checkout
- ✅ `web/app/checkout/callback/page.tsx`
- ✅ Order tracking via `/api/orders/{id}/tracking`
- ✅ `web/app/_components/CheckoutSteps.tsx`
- ✅ Shipping form in checkout
- ✅ Payment handled via Paystack
- ✅ Order summary in checkout
- ✅ `.env` configured with Paystack keys

**Backend Touchpoints:**
- ✅ POST /api/checkout/init
- ✅ POST /api/paystack/webhook
- ✅ GET /api/paystack/verify
- ✅ GET /api/orders/{id}/tracking
- ✅ GET /api/shipping/calculate

**Acceptance Criteria:**
- ✅ Complete checkout flow from cart to confirmation
- ✅ Paystack integration works with test keys
- ✅ Mock service provides realistic responses
- ⚠️ Order confirmation emails (Resend configured but not fully implemented)
- ✅ Payment confirmation and cart clearing
6. P0-6: Railway Deployment Configuration ✅ COMPLETED
**Tasks:**
- ✅ Configure Railway deployment for Next.js frontend
- ✅ Set up environment variables management
- ✅ Configure custom domain (if available)
- ✅ Implement health checks and monitoring
- ✅ Document deployment process

**Files to Create/Modify:**
- ✅ `railway.json` (Railway configuration)
- ✅ Dockerfiles created for deployment
- ✅ `.env.example` (environment template)
- ✅ `web/app/api/health/route.ts` (health check endpoint)
- ✅ `docs/DEPLOY_RAILWAY.md`
- ✅ `docs/RAILWAY_ENVS.md`

**Acceptance Criteria:**
- ✅ Railway deployment configuration ready
- ✅ Environment variables properly documented
- ✅ Health checks implemented
- ✅ SSL/HTTPS ready for Railway
- ✅ Deployment documentation complete
7. P0-7: Testing Infrastructure & Coverage ⚠️ PARTIALLY COMPLETED
**Tasks:**
- ❌ Set up Jest and React Testing Library
- ✅ Configure Playwright for E2E testing
- ❌ Write unit tests for critical components
- ✅ Create E2E tests for checkout flow
- ✅ Set up CI/CD pipeline with test automation

**Files to Create/Modify:**
- ❌ `jest.config.js`
- ✅ `web/playwright.config.ts`
- ❌ `src/__tests__/components/*.test.tsx`
- ✅ `web/tests/checkout.test.ts`
- ✅ `web/tests/cart.test.ts`
- ✅ `.github/workflows/web-e2e.yml`
- ✅ `web/package.json` (test scripts)

**Acceptance Criteria:**
- ❌ 70% code coverage for components
- ✅ E2E tests cover critical user paths
- ✅ Tests run automatically on commits
- ⚠️ Test reports generated (in CI)
8. P1-1: User Authentication System ⚠️ PARTIALLY COMPLETED
**Tasks:**
- ✅ Implement login page (admin/staff only)
- ❌ Add social authentication (Google, Facebook)
- ❌ Create password reset flow
- ✅ Implement JWT token management
- ✅ Add protected route middleware (admin routes)

**Files to Create/Modify:**
- ✅ `web/app/login/page.tsx`
- ❌ Register functionality (admin creates users)
- ❌ `ForgotPasswordModal.tsx`
- ✅ Cookie-based auth in login
- ✅ `web/app/api/auth/login/route.ts`
- ✅ `web/app/api/auth/logout/route.ts`
- ✅ Admin route protection

**Backend Touchpoints:**
- ✅ POST /api/auth/login
- ❌ POST /api/auth/register
- ❌ POST /api/auth/refresh
- ✅ Logout via cookie clearing
- ❌ POST /api/auth/reset-password

**Acceptance Criteria:**
- ✅ Secure authentication flow (staff/admin)
- ❌ Token refresh mechanism
- ✅ Protected routes working (admin)
- ✅ Session persistence via cookies
9. P1-2: User Dashboard & Account Management
**Tasks:**
- Build user dashboard layout
- Implement order history with filters
- Create profile editing forms
- Add address book management
- Implement wishlist functionality

**Files to Create/Modify:**
- `src/pages/account/index.tsx`
- `src/pages/account/orders.tsx`
- `src/pages/account/profile.tsx`
- `src/pages/account/addresses.tsx`
- `src/pages/account/wishlist.tsx`
- `src/components/account/OrderHistory.tsx`
- `src/components/account/AddressCard.tsx`
- `src/components/account/ProfileForm.tsx`

**Backend Touchpoints:**
- GET /api/users/profile
- PUT /api/users/profile
- GET /api/users/orders
- CRUD /api/users/addresses
- CRUD /api/users/wishlist

**Acceptance Criteria:**
- Complete account management features
- Order tracking and history
- Profile updates persist
- Mobile-responsive dashboard
10. P1-3: Enhanced Search & Filtering
**Tasks:**
- Implement advanced search with autocomplete
- Add category-based filtering
- Create price range slider
- Add sort functionality
- Implement search results page

**Files to Create/Modify:**
- `src/components/search/SearchBar.tsx`
- `src/components/search/SearchResults.tsx`
- `src/components/filters/CategoryFilter.tsx`
- `src/components/filters/PriceRangeFilter.tsx`
- `src/pages/search.tsx`
- `src/hooks/useSearch.ts`

**Backend Touchpoints:**
- GET /api/search (with query params)
- GET /api/categories
- GET /api/search/suggestions

**Acceptance Criteria:**
- Fast, responsive search
- Relevant search results
- Filter combinations work
- Search history saved
11. P2-1: Performance Optimization
**Tasks:**
- Implement image optimization with next/image
- Add lazy loading for components
- Configure ISR/SSG for product pages
- Implement Redis caching for API responses
- Add bundle size optimization

**Files to Create/Modify:**
- `next.config.js` (optimization settings)
- `src/lib/cache.ts` (caching utilities)
- Update all image components
- Add dynamic imports where needed

**Acceptance Criteria:**
- Lighthouse score > 90
- Initial load time < 3s
- Image optimization working
- Caching strategy documented
12. P2-2: SEO & Analytics
**Tasks:**
- Add meta tags and Open Graph data
- Implement structured data (JSON-LD)
- Set up Google Analytics/Plausible
- Add sitemap generation
- Implement conversion tracking

**Files to Create/Modify:**
- `src/components/SEO.tsx`
- `src/pages/sitemap.xml.tsx`
- `src/pages/robots.txt`
- `src/lib/analytics.ts`
- Update all pages with SEO components

**Acceptance Criteria:**
- All pages have proper meta tags
- Analytics tracking working
- Sitemap auto-generated
- Rich snippets in search results
13. P2-3: Accessibility & Internationalization
**Tasks:**
- Complete WCAG 2.1 AA compliance audit
- Add screen reader support
- Implement keyboard navigation
- Set up i18n infrastructure
- Add language switcher

**Files to Create/Modify:**
- `src/lib/i18n.ts`
- `src/locales/*.json`
- `src/components/LanguageSwitcher.tsx`
- Update all components for a11y

**Acceptance Criteria:**
- Passes accessibility audit
- Keyboard navigation complete
- Multi-language support ready
- ARIA labels implemented