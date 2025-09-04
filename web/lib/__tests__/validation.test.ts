/**
 * Comprehensive tests for validation utilities
 */

import {
  ValidationUtils,
  ProductValidation,
  UserValidation,
  ApiResponseValidation,
  FormValidation,
  BatchValidation,
  validationCache
} from '../validation'

// Mock data
const createMockProduct = (overrides: any = {}) => ({
  id: 1,
  title: 'Test Product',
  slug: 'test-product',
  description: 'A test product description',
  variants: [
    {
      id: 10,
      product_id: 1,
      title: 'Default',
      price: 100,
      compare_at_price: null,
      inventory_quantity: 10,
      sku: 'TEST-SKU',
      weight: 1,
      requires_shipping: true,
      taxable: true,
      barcode: null,
      fulfillment_service: 'manual',
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ],
  images: [
    {
      id: 100,
      product_id: 1,
      url: 'https://example.com/image.jpg',
      alt_text: 'Test image',
      width: 500,
      height: 500,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ],
  category_id: 1,
  compare_at_price: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
})

const createMockUser = (overrides: any = {}) => ({
  id: 1,
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
})

describe('ValidationUtils', () => {
  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(ValidationUtils.isNonEmptyString('hello')).toBe(true)
      expect(ValidationUtils.isNonEmptyString('  test  ')).toBe(true)
    })

    it('should return false for empty or invalid strings', () => {
      expect(ValidationUtils.isNonEmptyString('')).toBe(false)
      expect(ValidationUtils.isNonEmptyString('   ')).toBe(false)
      expect(ValidationUtils.isNonEmptyString(null)).toBe(false)
      expect(ValidationUtils.isNonEmptyString(undefined)).toBe(false)
      expect(ValidationUtils.isNonEmptyString(123)).toBe(false)
    })
  })

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(ValidationUtils.isPositiveNumber(1)).toBe(true)
      expect(ValidationUtils.isPositiveNumber(0.1)).toBe(true)
      expect(ValidationUtils.isPositiveNumber(100)).toBe(true)
    })

    it('should return false for non-positive numbers', () => {
      expect(ValidationUtils.isPositiveNumber(0)).toBe(false)
      expect(ValidationUtils.isPositiveNumber(-1)).toBe(false)
      expect(ValidationUtils.isPositiveNumber(NaN)).toBe(false)
      expect(ValidationUtils.isPositiveNumber(Infinity)).toBe(false)
      expect(ValidationUtils.isPositiveNumber('1')).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true)
      expect(ValidationUtils.isValidEmail('user.name+tag@domain.co.uk')).toBe(true)
    })

    it('should return false for invalid emails', () => {
      expect(ValidationUtils.isValidEmail('invalid-email')).toBe(false)
      expect(ValidationUtils.isValidEmail('@example.com')).toBe(false)
      expect(ValidationUtils.isValidEmail('test@')).toBe(false)
      expect(ValidationUtils.isValidEmail('')).toBe(false)
      expect(ValidationUtils.isValidEmail(null)).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(ValidationUtils.isValidUrl('https://example.com')).toBe(true)
      expect(ValidationUtils.isValidUrl('http://localhost:3000')).toBe(true)
      expect(ValidationUtils.isValidUrl('https://example.com/path?query=1')).toBe(true)
    })

    it('should return false for invalid URLs', () => {
      expect(ValidationUtils.isValidUrl('not-a-url')).toBe(false)
      expect(ValidationUtils.isValidUrl('ftp://example.com')).toBe(false) // Invalid protocol for our use case
      expect(ValidationUtils.isValidUrl('')).toBe(false)
      expect(ValidationUtils.isValidUrl(null)).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('should trim and remove dangerous characters', () => {
      expect(ValidationUtils.sanitizeString('  hello  ')).toBe('hello')
      expect(ValidationUtils.sanitizeString('hello<script>alert("xss")</script>')).toBe('helloscript>alert("xss")/script')
      expect(ValidationUtils.sanitizeString('normal text')).toBe('normal text')
    })
  })
})

describe('ProductValidation', () => {
  describe('isValidProduct', () => {
    it('should return true for valid products', () => {
      const product = createMockProduct()
      expect(ProductValidation.isValidProduct(product)).toBe(true)
    })

    it('should return false for invalid products', () => {
      expect(ProductValidation.isValidProduct(null)).toBe(false)
      expect(ProductValidation.isValidProduct({})).toBe(false)
      expect(ProductValidation.isValidProduct(createMockProduct({ id: 'invalid' }))).toBe(false)
      expect(ProductValidation.isValidProduct(createMockProduct({ title: '' }))).toBe(false)
      expect(ProductValidation.isValidProduct(createMockProduct({ variants: [] }))).toBe(false)
    })
  })

  describe('validateProduct', () => {
    it('should validate valid products successfully', () => {
      const product = createMockProduct()
      const result = ProductValidation.validateProduct(product)
      
      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(product)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for invalid products', () => {
      const invalidProduct = createMockProduct({ 
        id: 'invalid',
        title: '',
        variants: []
      })
      
      const result = ProductValidation.validateProduct(invalidProduct)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.field === 'id')).toBe(true)
      expect(result.errors.some(e => e.field === 'title')).toBe(true)
      expect(result.errors.some(e => e.field === 'variants')).toBe(true)
    })

    it('should sanitize data when requested', () => {
      const product = createMockProduct({
        title: '  Product with spaces  ',
        description: 'Description with <script>alert("xss")</script>'
      })
      
      const result = ProductValidation.validateProduct(product, { sanitize: true })
      
      expect(result.isValid).toBe(true)
      expect(result.data?.title).toBe('Product with spaces')
      expect(result.data?.description).toBe('Description with script>alert("xss")/script')
    })

    it('should handle warnings in strict mode', () => {
      const product = createMockProduct({ images: [] })
      
      const normalResult = ProductValidation.validateProduct(product)
      expect(normalResult.isValid).toBe(true)
      expect(normalResult.warnings.length).toBeGreaterThan(0)
      
      const strictResult = ProductValidation.validateProduct(product, { strict: true })
      expect(strictResult.isValid).toBe(false)
    })
  })
})

describe('UserValidation', () => {
  describe('isValidUser', () => {
    it('should return true for valid users', () => {
      const user = createMockUser()
      expect(UserValidation.isValidUser(user)).toBe(true)
    })

    it('should return false for invalid users', () => {
      expect(UserValidation.isValidUser(null)).toBe(false)
      expect(UserValidation.isValidUser({})).toBe(false)
      expect(UserValidation.isValidUser(createMockUser({ email: 'invalid-email' }))).toBe(false)
      expect(UserValidation.isValidUser(createMockUser({ first_name: '' }))).toBe(false)
    })
  })

  describe('validateUser', () => {
    it('should validate valid users successfully', () => {
      const user = createMockUser()
      const result = UserValidation.validateUser(user)
      
      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(user)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for invalid users', () => {
      const invalidUser = createMockUser({
        email: 'invalid-email',
        first_name: '',
        is_active: 'not-boolean'
      })
      
      const result = UserValidation.validateUser(invalidUser)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.field === 'email')).toBe(true)
      expect(result.errors.some(e => e.field === 'first_name')).toBe(true)
      expect(result.errors.some(e => e.field === 'is_active')).toBe(true)
    })
  })
})

describe('ApiResponseValidation', () => {
  describe('isValidApiResponse', () => {
    it('should validate successful API responses', () => {
      const response = { success: true, data: { id: 1, name: 'test' } }
      expect(ApiResponseValidation.isValidApiResponse(response)).toBe(true)
    })

    it('should validate error API responses', () => {
      const response = { success: false, error: 'Something went wrong' }
      expect(ApiResponseValidation.isValidApiResponse(response)).toBe(true)
    })

    it('should reject invalid API responses', () => {
      expect(ApiResponseValidation.isValidApiResponse(null)).toBe(false)
      expect(ApiResponseValidation.isValidApiResponse({})).toBe(false)
      expect(ApiResponseValidation.isValidApiResponse({ success: 'not-boolean' })).toBe(false)
    })
  })

  describe('validateProductsResponse', () => {
    it('should validate array of valid products', () => {
      const products = [createMockProduct({ id: 1 }), createMockProduct({ id: 2 })]
      const result = ApiResponseValidation.validateProductsResponse(products)
      
      expect(result.isValid).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle mixed valid and invalid products', () => {
      const products = [
        createMockProduct({ id: 1 }),
        { invalid: 'product' },
        createMockProduct({ id: 3 })
      ]
      
      const result = ApiResponseValidation.validateProductsResponse(products)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('FormValidation', () => {
  describe('validateField', () => {
    it('should validate field with rules', () => {
      const rules = [
        FormValidation.rules.required('email'),
        FormValidation.rules.email('email')
      ]
      
      const validResult = FormValidation.validateField('test@example.com', rules)
      expect(validResult.isValid).toBe(true)
      
      const invalidResult = FormValidation.validateField('invalid-email', rules)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors.some(e => e.code === 'INVALID_EMAIL')).toBe(true)
    })
  })

  describe('rules', () => {
    it('should validate required fields', () => {
      const rule = FormValidation.rules.required('name')
      
      expect(rule.validator('John').isValid).toBe(true)
      expect(rule.validator('').isValid).toBe(false)
      expect(rule.validator(null).isValid).toBe(false)
      expect(rule.validator(undefined).isValid).toBe(false)
    })

    it('should validate minimum length', () => {
      const rule = FormValidation.rules.minLength('password', 8)
      
      expect(rule.validator('12345678').isValid).toBe(true)
      expect(rule.validator('1234567').isValid).toBe(false)
      expect(rule.validator('').isValid).toBe(true) // Empty is allowed, use required rule for that
    })

    it('should validate positive numbers', () => {
      const rule = FormValidation.rules.positiveNumber('price')
      
      expect(rule.validator(10).isValid).toBe(true)
      expect(rule.validator(0).isValid).toBe(false)
      expect(rule.validator(-5).isValid).toBe(false)
      expect(rule.validator('not-a-number').isValid).toBe(false)
    })
  })
})

describe('BatchValidation', () => {
  describe('validateBatch', () => {
    it('should validate array of items', () => {
      const products = [
        createMockProduct({ id: 1 }),
        createMockProduct({ id: 2 }),
        createMockProduct({ id: 3 })
      ]
      
      const result = BatchValidation.validateBatch(products, ProductValidation.validateProduct)
      
      expect(result.isValid).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle mixed valid and invalid items', () => {
      const items = [
        createMockProduct({ id: 1 }),
        { invalid: 'item' },
        createMockProduct({ id: 3 })
      ]
      
      const result = BatchValidation.validateBatch(items, ProductValidation.validateProduct)
      
      expect(result.isValid).toBe(false)
      expect(result.data).toHaveLength(2) // Only valid items
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateObject', () => {
    it('should validate object with multiple fields', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      }
      
      const validators = {
        name: [FormValidation.rules.required('name'), FormValidation.rules.minLength('name', 2)],
        email: [FormValidation.rules.required('email'), FormValidation.rules.email('email')],
        age: [FormValidation.rules.positiveNumber('age')]
      }
      
      const result = BatchValidation.validateObject(obj, validators)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})

describe('ValidationCache', () => {
  beforeEach(() => {
    validationCache.clear()
  })

  it('should cache validation results', () => {
    const product = createMockProduct()
    const validator = jest.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] })
    
    // First call should execute validator
    const result1 = validator(product)
    validationCache.set(product, 'test-validator', result1)
    
    // Second call should return cached result
    const cached = validationCache.get(product, 'test-validator')
    
    expect(cached).toEqual(expect.objectContaining({
      isValid: true,
      errors: [],
      warnings: []
    }))
  })

  it('should handle cache misses', () => {
    const product = createMockProduct()
    const cached = validationCache.get(product, 'non-existent-validator')
    
    expect(cached).toBeNull()
  })
})
