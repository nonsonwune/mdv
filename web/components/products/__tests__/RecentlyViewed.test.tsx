/**
 * RecentlyViewed Component Tests
 * 
 * Tests for the enhanced RecentlyViewed component with robust validation,
 * HEAD request verification, and localStorage management.
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { jest } from '@jest/globals'
import RecentlyViewed, { useRecentlyViewed } from '../RecentlyViewed'
import type { Product } from '../../../lib/types'

// Mock fetch for HEAD requests
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

// Mock console methods
const mockConsoleLog = jest.fn()
const mockConsoleWarn = jest.fn()
const mockConsoleError = jest.fn()
global.console = {
  ...console,
  log: mockConsoleLog,
  warn: mockConsoleWarn,
  error: mockConsoleError
}

// Sample product data
const createMockProduct = (id: number, title: string = `Product ${id}`): Product => ({
  id,
  title,
  slug: `product-${id}`,
  description: `Description for ${title}`,
  variants: [
    {
      id: id * 10,
      product_id: id,
      title: 'Default',
      price: 100 + id,
      compare_at_price: null,
      inventory_quantity: 10,
      sku: `SKU-${id}`,
      weight: 1,
      requires_shipping: true,
      taxable: true,
      barcode: null,
      fulfillment_service: 'manual',
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  images: [
    {
      id: id * 100,
      product_id: id,
      url: `https://example.com/image-${id}.jpg`,
      alt_text: `Image for ${title}`,
      width: 500,
      height: 500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  category_id: 1,
  compare_at_price: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

describe('RecentlyViewed Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()
    mockFetch.mockClear()
    mockConsoleLog.mockClear()
    mockConsoleWarn.mockClear()
    mockConsoleError.mockClear()
  })

  describe('Basic Rendering', () => {
    it('renders nothing when no products are stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<RecentlyViewed />)
      
      expect(screen.queryByText('Recently Viewed')).not.toBeInTheDocument()
    })

    it('renders products from localStorage', async () => {
      const products = [createMockProduct(1), createMockProduct(2)]
      const recentlyViewedItems = products.map(product => ({
        productId: String(product.id),
        viewedAt: new Date().toISOString(),
        product
      }))
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentlyViewedItems))
      mockFetch.mockResolvedValue({ ok: true })
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(screen.getByText('Recently Viewed')).toBeInTheDocument()
        expect(screen.getByText('Product 1')).toBeInTheDocument()
        expect(screen.getByText('Product 2')).toBeInTheDocument()
      })
    })

    it('filters out current product when currentProductId is provided', async () => {
      const products = [createMockProduct(1), createMockProduct(2)]
      const recentlyViewedItems = products.map(product => ({
        productId: String(product.id),
        viewedAt: new Date().toISOString(),
        product
      }))
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentlyViewedItems))
      mockFetch.mockResolvedValue({ ok: true })
      
      render(<RecentlyViewed currentProductId={1} />)
      
      await waitFor(() => {
        expect(screen.getByText('Recently Viewed')).toBeInTheDocument()
        expect(screen.queryByText('Product 1')).not.toBeInTheDocument()
        expect(screen.getByText('Product 2')).toBeInTheDocument()
      })
    })
  })

  describe('Data Validation', () => {
    it('filters out invalid product data', async () => {
      const validProduct = createMockProduct(1)
      const invalidProducts = [
        { id: 2 }, // Missing required fields
        { title: 'Invalid', variants: [] }, // Missing id, empty variants
        null, // Null product
        undefined // Undefined product
      ]
      
      const mixedItems = [
        {
          productId: '1',
          viewedAt: new Date().toISOString(),
          product: validProduct
        },
        ...invalidProducts.map((product, index) => ({
          productId: String(index + 2),
          viewedAt: new Date().toISOString(),
          product
        }))
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mixedItems))
      mockFetch.mockResolvedValue({ ok: true })
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(screen.getByText('Recently Viewed')).toBeInTheDocument()
        expect(screen.getByText('Product 1')).toBeInTheDocument()
        // Invalid products should not be rendered
        expect(screen.queryByText('Invalid')).not.toBeInTheDocument()
      })
    })

    it('handles corrupted localStorage data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Error parsing recently viewed products:',
          expect.any(Error)
        )
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mdv_recently_viewed')
      })
    })

    it('converts old format to new format', async () => {
      const oldFormatProducts = [createMockProduct(1), createMockProduct(2)]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldFormatProducts))
      mockFetch.mockResolvedValue({ ok: true })
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'mdv_recently_viewed',
          expect.stringContaining('"productId":"1"')
        )
      })
    })
  })

  describe('Product Existence Validation', () => {
    it('validates products exist via HEAD requests', async () => {
      const products = [createMockProduct(1), createMockProduct(2)]
      const recentlyViewedItems = products.map(product => ({
        productId: String(product.id),
        viewedAt: new Date().toISOString(),
        product
      }))
      
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // version check
        .mockReturnValueOnce(null) // last validation check
        .mockReturnValue(JSON.stringify(recentlyViewedItems))
      
      // Mock HEAD requests - product 1 exists, product 2 doesn't
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Product 1 exists
        .mockResolvedValueOnce({ ok: false, status: 404 }) // Product 2 deleted
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/products/1', {
          method: 'HEAD',
          cache: 'no-cache'
        })
        expect(mockFetch).toHaveBeenCalledWith('/api/products/2', {
          method: 'HEAD',
          cache: 'no-cache'
        })
      })

      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Removing deleted product from recently viewed: Product 2'
        )
      })
    })

    it('keeps products on network errors during validation', async () => {
      const products = [createMockProduct(1)]
      const recentlyViewedItems = products.map(product => ({
        productId: String(product.id),
        viewedAt: new Date().toISOString(),
        product
      }))
      
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // version check
        .mockReturnValueOnce(null) // last validation check
        .mockReturnValue(JSON.stringify(recentlyViewedItems))
      
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument()
      })
    })
  })

  describe('Age-based Filtering', () => {
    it('filters out products older than 30 days', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 31) // 31 days ago
      
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 1) // 1 day ago
      
      const recentlyViewedItems = [
        {
          productId: '1',
          viewedAt: oldDate.toISOString(),
          product: createMockProduct(1, 'Old Product')
        },
        {
          productId: '2',
          viewedAt: recentDate.toISOString(),
          product: createMockProduct(2, 'Recent Product')
        }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentlyViewedItems))
      mockFetch.mockResolvedValue({ ok: true })
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(screen.queryByText('Old Product')).not.toBeInTheDocument()
        expect(screen.getByText('Recent Product')).toBeInTheDocument()
      })
    })
  })

  describe('Validation Intervals', () => {
    it('skips validation when recently validated', async () => {
      const recentValidation = Date.now() - (12 * 60 * 60 * 1000) // 12 hours ago
      
      mockLocalStorage.getItem
        .mockReturnValueOnce('v3.0') // current version
        .mockReturnValueOnce(String(recentValidation)) // recent validation
        .mockReturnValue('[]')
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled()
      })
    })

    it('performs validation when validation is old', async () => {
      const oldValidation = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const products = [createMockProduct(1)]
      const recentlyViewedItems = products.map(product => ({
        productId: String(product.id),
        viewedAt: new Date().toISOString(),
        product
      }))
      
      mockLocalStorage.getItem
        .mockReturnValueOnce('v3.0') // current version
        .mockReturnValueOnce(String(oldValidation)) // old validation
        .mockReturnValue(JSON.stringify(recentlyViewedItems))
      
      mockFetch.mockResolvedValue({ ok: true })
      
      render(<RecentlyViewed />)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/products/1', {
          method: 'HEAD',
          cache: 'no-cache'
        })
      })
    })
  })
})

describe('useRecentlyViewed Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
  })

  it('adds product to recently viewed', () => {
    const TestComponent = () => {
      const { addProduct } = useRecentlyViewed()
      
      React.useEffect(() => {
        addProduct(createMockProduct(1))
      }, [addProduct])
      
      return <div>Test</div>
    }
    
    mockLocalStorage.getItem.mockReturnValue('[]')
    
    render(<TestComponent />)
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'mdv_recently_viewed',
      expect.stringContaining('"productId":"1"')
    )
  })

  it('handles invalid product data gracefully', () => {
    const TestComponent = () => {
      const { addProduct } = useRecentlyViewed()
      
      React.useEffect(() => {
        addProduct({ id: 1 } as any) // Invalid product
      }, [addProduct])
      
      return <div>Test</div>
    }
    
    render(<TestComponent />)
    
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Invalid product data provided to useRecentlyViewed:',
      expect.any(Object)
    )
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
  })
})
