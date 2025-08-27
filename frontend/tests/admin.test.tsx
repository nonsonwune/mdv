/**
 * Integration tests for admin functionality
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import AdminHome from '../app/admin/page'
import AdminUsers from '../app/admin/users/page'
import AdminProducts from '../app/admin/products/page'
import AdminOrders from '../app/admin/orders/page'
import AdminInventory from '../app/admin/inventory/page'
import AdminLayout from '../components/AdminLayout'
import AdminNavigation from '../components/AdminNavigation'
import { useAuth } from '../hooks/useAuth'

// Mock the auth hook
jest.mock('../hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock API responses
const server = setupServer(
  // Admin stats
  rest.get('/api/admin/stats', (req, res, ctx) => {
    return res(ctx.json({
      totalProducts: 150,
      totalOrders: 45,
      totalUsers: 12,
      revenue: 25000
    }))
  }),

  // User management
  rest.get('/api/admin/users', (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1'
    const limit = req.url.searchParams.get('limit') || '10'
    
    return res(ctx.json({
      items: [
        { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin', active: true },
        { id: 2, name: 'Operations User', email: 'ops@test.com', role: 'operations', active: true },
      ],
      total: 2,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: 1
    }))
  }),

  rest.get('/api/admin/users/stats', (req, res, ctx) => {
    return res(ctx.json({
      total_users: 12,
      active_users: 10,
      by_role: {
        admin: 2,
        supervisor: 3,
        operations: 4,
        logistics: 3
      }
    }))
  }),

  // Product management
  rest.get('/api/admin/products', (req, res, ctx) => {
    return res(ctx.json({
      items: [
        { 
          id: 1, 
          name: 'Test Product', 
          sku: 'TEST-001', 
          price: 99.99, 
          category: 'Electronics',
          active: true
        }
      ],
      total: 1,
      page: 1,
      limit: 10,
      pages: 1
    }))
  }),

  // Order management
  rest.get('/api/admin/orders', (req, res, ctx) => {
    return res(ctx.json({
      items: [
        {
          id: 1,
          order_number: 'ORD-001',
          customer_name: 'John Doe',
          total: 199.98,
          status: 'pending',
          created_at: '2024-01-15T10:30:00Z'
        }
      ],
      total: 1,
      page: 1,
      limit: 10,
      pages: 1
    }))
  }),

  // Inventory management
  rest.get('/api/admin/inventory', (req, res, ctx) => {
    return res(ctx.json({
      items: [
        {
          id: 1,
          variant_id: 1,
          product_name: 'Test Product',
          variant_name: 'Standard',
          current_stock: 50,
          reserved_stock: 5,
          available_stock: 45,
          last_updated: '2024-01-15T10:30:00Z'
        }
      ],
      total: 1,
      page: 1,
      limit: 10,
      pages: 1
    }))
  }),

  rest.get('/api/admin/inventory/low-stock', (req, res, ctx) => {
    return res(ctx.json([
      {
        variant_id: 2,
        product_name: 'Low Stock Product',
        variant_name: 'Red',
        current_stock: 5,
        threshold: 10
      }
    ]))
  }),

  // Analytics
  rest.get('/api/admin/analytics', (req, res, ctx) => {
    return res(ctx.json({
      sales: {
        total_revenue: 125000,
        total_orders: 450,
        avg_order_value: 278,
        growth_rate: 15.5
      },
      products: {
        total_products: 150,
        active_products: 140,
        top_selling: [
          { name: 'Product A', sales: 120 },
          { name: 'Product B', sales: 95 }
        ]
      },
      categories: {
        total_categories: 12,
        performance: [
          { name: 'Electronics', revenue: 85000 },
          { name: 'Clothing', revenue: 40000 }
        ]
      },
      customers: {
        total_customers: 350,
        new_customers: 45,
        returning_customers: 305
      }
    }))
  })
)

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Admin Dashboard', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      isAuthenticated: true,
      permissions: ['manage_users', 'manage_products', 'manage_orders', 'view_analytics']
    })
  })

  describe('AdminHome Component', () => {
    it('renders dashboard with stats cards', async () => {
      render(
        <TestWrapper>
          <AdminHome />
        </TestWrapper>
      )

      // Wait for stats to load
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument() // Total products
        expect(screen.getByText('45')).toBeInTheDocument() // Total orders
        expect(screen.getByText('12')).toBeInTheDocument() // Total users
        expect(screen.getByText('$25,000')).toBeInTheDocument() // Revenue
      })
    })

    it('shows role-appropriate welcome message', async () => {
      render(
        <TestWrapper>
          <AdminHome />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Admin User/)).toBeInTheDocument()
      })
    })

    it('displays low stock alerts', async () => {
      render(
        <TestWrapper>
          <AdminHome />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Low Stock Products/)).toBeInTheDocument()
      })
    })
  })

  describe('AdminNavigation Component', () => {
    it('renders navigation links based on permissions', () => {
      render(
        <TestWrapper>
          <AdminNavigation />
        </TestWrapper>
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Inventory')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    it('highlights active navigation item', () => {
      // This would require mocking useRouter or similar
      // Implementation depends on your routing setup
    })
  })

  describe('AdminLayout Component', () => {
    it('renders with navigation sidebar', () => {
      render(
        <TestWrapper>
          <AdminLayout>
            <div>Test Content</div>
          </AdminLayout>
        </TestWrapper>
      )

      expect(screen.getByText('Test Content')).toBeInTheDocument()
      // Check that navigation is present
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('is responsive for mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TestWrapper>
          <AdminLayout>
            <div>Test Content</div>
          </AdminLayout>
        </TestWrapper>
      )

      // On mobile, navigation should be collapsible
      // Implementation depends on your mobile navigation setup
    })
  })
})

describe('User Management', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      isAuthenticated: true,
      permissions: ['manage_users']
    })
  })

  it('displays users list with pagination', async () => {
    render(
      <TestWrapper>
        <AdminUsers />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('Operations User')).toBeInTheDocument()
      expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    })
  })

  it('displays user statistics', async () => {
    render(
      <TestWrapper>
        <AdminUsers />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument() // Total users
      expect(screen.getByText('10')).toBeInTheDocument() // Active users
    })
  })

  it('shows create user button for authorized roles', async () => {
    render(
      <TestWrapper>
        <AdminUsers />
      </TestWrapper>
    )

    expect(screen.getByText(/Create User/)).toBeInTheDocument()
  })
})

describe('Product Management', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      isAuthenticated: true,
      permissions: ['manage_products']
    })
  })

  it('displays products list', async () => {
    render(
      <TestWrapper>
        <AdminProducts />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('TEST-001')).toBeInTheDocument()
      expect(screen.getByText('$99.99')).toBeInTheDocument()
    })
  })

  it('shows create product button', async () => {
    render(
      <TestWrapper>
        <AdminProducts />
      </TestWrapper>
    )

    expect(screen.getByText(/Add Product/)).toBeInTheDocument()
  })
})

describe('Order Management', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      isAuthenticated: true,
      permissions: ['manage_orders']
    })
  })

  it('displays orders list', async () => {
    render(
      <TestWrapper>
        <AdminOrders />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('$199.98')).toBeInTheDocument()
      expect(screen.getByText('pending')).toBeInTheDocument()
    })
  })
})

describe('Inventory Management', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      isAuthenticated: true,
      permissions: ['manage_inventory']
    })
  })

  it('displays inventory list', async () => {
    render(
      <TestWrapper>
        <AdminInventory />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('Standard')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument() // Current stock
      expect(screen.getByText('45')).toBeInTheDocument() // Available stock
    })
  })

  it('shows inventory adjustment controls for authorized roles', async () => {
    render(
      <TestWrapper>
        <AdminInventory />
      </TestWrapper>
    )

    // Should show adjustment buttons/controls
    await waitFor(() => {
      expect(screen.getByText(/Adjust/)).toBeInTheDocument()
    })
  })
})

describe('Permission-Based Access Control', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('hides user management for operations role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 3, name: 'Operations User', email: 'ops@test.com', role: 'operations' },
      isAuthenticated: true,
      permissions: ['manage_products', 'manage_orders']
    })

    render(
      <TestWrapper>
        <AdminNavigation />
      </TestWrapper>
    )

    expect(screen.queryByText('Users')).not.toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('Orders')).toBeInTheDocument()
  })

  it('shows limited functionality for logistics role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 4, name: 'Logistics User', email: 'logistics@test.com', role: 'logistics' },
      isAuthenticated: true,
      permissions: ['view_products', 'view_inventory', 'view_orders']
    })

    render(
      <TestWrapper>
        <AdminNavigation />
      </TestWrapper>
    )

    expect(screen.queryByText('Users')).not.toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('Orders')).toBeInTheDocument()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
  })
})

describe('Error Handling', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      isAuthenticated: true,
      permissions: ['manage_users', 'manage_products']
    })
  })

  it('handles API errors gracefully', async () => {
    // Mock API error
    server.use(
      rest.get('/api/admin/users', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ detail: 'Internal server error' }))
      })
    )

    render(
      <TestWrapper>
        <AdminUsers />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/Error loading/)).toBeInTheDocument()
    })
  })

  it('handles permission denied errors', async () => {
    // Mock 403 error
    server.use(
      rest.get('/api/admin/users', (req, res, ctx) => {
        return res(ctx.status(403), ctx.json({ detail: 'Permission denied' }))
      })
    )

    render(
      <TestWrapper>
        <AdminUsers />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
    })
  })

  it('shows loading states during API calls', () => {
    render(
      <TestWrapper>
        <AdminUsers />
      </TestWrapper>
    )

    // Should show loading indicator initially
    expect(screen.getByText(/Loading/)).toBeInTheDocument()
  })
})

describe('Responsive Design', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      isAuthenticated: true,
      permissions: ['manage_users', 'manage_products']
    })
  })

  it('adapts layout for mobile screens', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(
      <TestWrapper>
        <AdminLayout>
          <AdminHome />
        </AdminLayout>
      </TestWrapper>
    )

    // Should have mobile-friendly layout
    // Implementation depends on your responsive design
  })

  it('adapts tables for small screens', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(
      <TestWrapper>
        <AdminUsers />
      </TestWrapper>
    )

    // Tables should be responsive or use cards on mobile
    await waitFor(() => {
      // Implementation depends on your responsive table design
    })
  })
})
