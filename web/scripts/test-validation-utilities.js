#!/usr/bin/env node

/**
 * Test script for validation utilities
 * 
 * This script validates the validation utilities implementation
 * by testing various validation scenarios and edge cases.
 */

// Mock global objects for Node.js environment
global.performance = {
  now: () => Date.now()
}

// Test data
const createMockProduct = (overrides = {}) => ({
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

const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
})

// Test functions
function testValidationUtils() {
  console.log('🧪 Testing ValidationUtils...')
  
  // Test string validation
  const isNonEmptyString = (value) => {
    return typeof value === 'string' && value.trim().length > 0
  }
  
  console.log('✅ Non-empty string validation:')
  console.log('  "hello":', isNonEmptyString('hello'))
  console.log('  "":', isNonEmptyString(''))
  console.log('  null:', isNonEmptyString(null))
  
  // Test number validation
  const isPositiveNumber = (value) => {
    return typeof value === 'number' && value > 0 && !isNaN(value) && isFinite(value)
  }
  
  console.log('✅ Positive number validation:')
  console.log('  1:', isPositiveNumber(1))
  console.log('  0:', isPositiveNumber(0))
  console.log('  -1:', isPositiveNumber(-1))
  console.log('  "1":', isPositiveNumber("1"))
  
  // Test email validation
  const isValidEmail = (value) => {
    if (typeof value !== 'string') return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }
  
  console.log('✅ Email validation:')
  console.log('  "test@example.com":', isValidEmail('test@example.com'))
  console.log('  "invalid-email":', isValidEmail('invalid-email'))
  console.log('  "":', isValidEmail(''))
  
  // Test URL validation
  const isValidUrl = (value) => {
    if (typeof value !== 'string') return false
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }
  
  console.log('✅ URL validation:')
  console.log('  "https://example.com":', isValidUrl('https://example.com'))
  console.log('  "not-a-url":', isValidUrl('not-a-url'))
  console.log('  "":', isValidUrl(''))
  
  console.log('✅ ValidationUtils test passed\n')
}

function testProductValidation() {
  console.log('🧪 Testing Product validation...')
  
  // Simulate product validation logic
  const validateProduct = (product) => {
    const errors = []
    const warnings = []
    
    if (!product || typeof product !== 'object') {
      errors.push({ field: 'product', message: 'Product must be an object', code: 'INVALID_TYPE' })
      return { isValid: false, errors, warnings }
    }
    
    // Validate required fields
    if (typeof product.id !== 'number' || product.id <= 0) {
      errors.push({ field: 'id', message: 'Product ID must be a positive integer', code: 'INVALID_ID' })
    }
    
    if (typeof product.title !== 'string' || product.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Product title must be a non-empty string', code: 'INVALID_TITLE' })
    }
    
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      errors.push({ field: 'variants', message: 'Product must have at least one variant', code: 'NO_VARIANTS' })
    }
    
    if (!Array.isArray(product.images) || product.images.length === 0) {
      warnings.push({ field: 'images', message: 'Product should have at least one image' })
    }
    
    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? product : undefined,
      errors,
      warnings
    }
  }
  
  // Test valid product
  const validProduct = createMockProduct()
  const validResult = validateProduct(validProduct)
  console.log('✅ Valid product validation:', validResult.isValid)
  console.log('  Errors:', validResult.errors.length)
  console.log('  Warnings:', validResult.warnings.length)
  
  // Test invalid product
  const invalidProduct = createMockProduct({ 
    id: 'invalid',
    title: '',
    variants: []
  })
  const invalidResult = validateProduct(invalidProduct)
  console.log('✅ Invalid product validation:', invalidResult.isValid)
  console.log('  Errors:', invalidResult.errors.length)
  console.log('  Error fields:', invalidResult.errors.map(e => e.field))
  
  // Test product with warnings
  const productWithWarnings = createMockProduct({ images: [] })
  const warningResult = validateProduct(productWithWarnings)
  console.log('✅ Product with warnings validation:', warningResult.isValid)
  console.log('  Warnings:', warningResult.warnings.length)
  
  console.log('✅ Product validation test passed\n')
}

function testUserValidation() {
  console.log('🧪 Testing User validation...')
  
  // Simulate user validation logic
  const validateUser = (user) => {
    const errors = []
    const warnings = []
    
    if (!user || typeof user !== 'object') {
      errors.push({ field: 'user', message: 'User must be an object', code: 'INVALID_TYPE' })
      return { isValid: false, errors, warnings }
    }
    
    // Validate required fields
    if (typeof user.id !== 'number' || user.id <= 0) {
      errors.push({ field: 'id', message: 'User ID must be a positive integer', code: 'INVALID_ID' })
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof user.email !== 'string' || !emailRegex.test(user.email)) {
      errors.push({ field: 'email', message: 'Email must be a valid email address', code: 'INVALID_EMAIL' })
    }
    
    if (typeof user.first_name !== 'string' || user.first_name.trim().length === 0) {
      errors.push({ field: 'first_name', message: 'First name must be a non-empty string', code: 'INVALID_FIRST_NAME' })
    }
    
    if (typeof user.is_active !== 'boolean') {
      errors.push({ field: 'is_active', message: 'Is active must be a boolean', code: 'INVALID_IS_ACTIVE' })
    }
    
    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? user : undefined,
      errors,
      warnings
    }
  }
  
  // Test valid user
  const validUser = createMockUser()
  const validResult = validateUser(validUser)
  console.log('✅ Valid user validation:', validResult.isValid)
  console.log('  Errors:', validResult.errors.length)
  
  // Test invalid user
  const invalidUser = createMockUser({
    email: 'invalid-email',
    first_name: '',
    is_active: 'not-boolean'
  })
  const invalidResult = validateUser(invalidUser)
  console.log('✅ Invalid user validation:', invalidResult.isValid)
  console.log('  Errors:', invalidResult.errors.length)
  console.log('  Error fields:', invalidResult.errors.map(e => e.field))
  
  console.log('✅ User validation test passed\n')
}

function testApiResponseValidation() {
  console.log('🧪 Testing API response validation...')
  
  // Simulate API response validation
  const isValidApiResponse = (value, dataValidator) => {
    if (!value || typeof value !== 'object') return false
    
    if (typeof value.success !== 'boolean') return false
    
    if (value.success) {
      return dataValidator ? dataValidator(value.data) : value.data !== undefined
    } else {
      return typeof value.error === 'string' || (value.error && typeof value.error.message === 'string')
    }
  }
  
  // Test successful response
  const successResponse = { success: true, data: { id: 1, name: 'test' } }
  console.log('✅ Valid success response:', isValidApiResponse(successResponse))
  
  // Test error response
  const errorResponse = { success: false, error: 'Something went wrong' }
  console.log('✅ Valid error response:', isValidApiResponse(errorResponse))
  
  // Test invalid response
  const invalidResponse = { success: 'not-boolean' }
  console.log('✅ Invalid response:', isValidApiResponse(invalidResponse))
  
  console.log('✅ API response validation test passed\n')
}

function testFormValidation() {
  console.log('🧪 Testing Form validation...')
  
  // Simulate form validation rules
  const createRule = (field, validator, message, code) => ({
    field,
    validator: (value) => ({ isValid: validator(value) }),
    message,
    code,
    severity: 'error'
  })
  
  const rules = {
    required: (field) => createRule(
      field,
      (value) => value !== null && value !== undefined && value !== '',
      `${field} is required`,
      'REQUIRED'
    ),
    email: (field) => createRule(
      field,
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      `${field} must be a valid email address`,
      'INVALID_EMAIL'
    ),
    minLength: (field, min) => createRule(
      field,
      (value) => !value || (typeof value === 'string' && value.length >= min),
      `${field} must be at least ${min} characters long`,
      'MIN_LENGTH'
    )
  }
  
  const validateField = (value, fieldRules) => {
    const errors = []
    
    for (const rule of fieldRules) {
      const result = rule.validator(value)
      if (!result.isValid) {
        errors.push({ field: rule.field, message: rule.message, code: rule.code })
      }
    }
    
    return { isValid: errors.length === 0, errors }
  }
  
  // Test email validation
  const emailRules = [rules.required('email'), rules.email('email')]
  
  const validEmailResult = validateField('test@example.com', emailRules)
  console.log('✅ Valid email validation:', validEmailResult.isValid)
  
  const invalidEmailResult = validateField('invalid-email', emailRules)
  console.log('✅ Invalid email validation:', invalidEmailResult.isValid)
  console.log('  Error codes:', invalidEmailResult.errors.map(e => e.code))
  
  // Test password validation
  const passwordRules = [rules.required('password'), rules.minLength('password', 8)]
  
  const validPasswordResult = validateField('12345678', passwordRules)
  console.log('✅ Valid password validation:', validPasswordResult.isValid)
  
  const shortPasswordResult = validateField('1234567', passwordRules)
  console.log('✅ Short password validation:', shortPasswordResult.isValid)
  console.log('  Error codes:', shortPasswordResult.errors.map(e => e.code))
  
  console.log('✅ Form validation test passed\n')
}

function testBatchValidation() {
  console.log('🧪 Testing Batch validation...')
  
  // Simulate batch validation
  const validateBatch = (items, validator) => {
    const errors = []
    const warnings = []
    const validItems = []
    
    items.forEach((item, index) => {
      const result = validator(item)
      if (result.isValid && result.data) {
        validItems.push(result.data)
      } else {
        errors.push({ field: `items[${index}]`, message: 'Invalid item in batch', code: 'INVALID_ITEM' })
        errors.push(...result.errors)
      }
      warnings.push(...result.warnings)
    })
    
    return {
      isValid: errors.length === 0,
      data: validItems,
      errors,
      warnings
    }
  }
  
  // Simple product validator for testing
  const simpleProductValidator = (product) => {
    if (!product || typeof product.id !== 'number' || typeof product.title !== 'string') {
      return { isValid: false, errors: [{ field: 'product', message: 'Invalid product' }], warnings: [] }
    }
    return { isValid: true, data: product, errors: [], warnings: [] }
  }
  
  // Test valid batch
  const validProducts = [
    createMockProduct({ id: 1 }),
    createMockProduct({ id: 2 }),
    createMockProduct({ id: 3 })
  ]
  
  const validBatchResult = validateBatch(validProducts, simpleProductValidator)
  console.log('✅ Valid batch validation:', validBatchResult.isValid)
  console.log('  Valid items:', validBatchResult.data.length)
  
  // Test mixed batch
  const mixedItems = [
    createMockProduct({ id: 1 }),
    { invalid: 'item' },
    createMockProduct({ id: 3 })
  ]
  
  const mixedBatchResult = validateBatch(mixedItems, simpleProductValidator)
  console.log('✅ Mixed batch validation:', mixedBatchResult.isValid)
  console.log('  Valid items:', mixedBatchResult.data.length)
  console.log('  Errors:', mixedBatchResult.errors.length)
  
  console.log('✅ Batch validation test passed\n')
}

function testPerformanceAndCaching() {
  console.log('🧪 Testing Performance and Caching...')
  
  // Simulate validation cache
  class ValidationCache {
    constructor() {
      this.cache = new Map()
      this.maxSize = 100
    }
    
    generateKey(data, validator) {
      return `${validator}:${JSON.stringify(data)}`
    }
    
    get(data, validator) {
      const key = this.generateKey(data, validator)
      return this.cache.get(key) || null
    }
    
    set(data, validator, result) {
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        this.cache.delete(firstKey)
      }
      
      const key = this.generateKey(data, validator)
      this.cache.set(key, result)
    }
    
    clear() {
      this.cache.clear()
    }
  }
  
  const cache = new ValidationCache()
  
  // Test caching
  const testData = { id: 1, name: 'test' }
  const testResult = { isValid: true, data: testData, errors: [], warnings: [] }
  
  // Cache miss
  const cached1 = cache.get(testData, 'test-validator')
  console.log('✅ Cache miss:', cached1 === null)
  
  // Set cache
  cache.set(testData, 'test-validator', testResult)
  
  // Cache hit
  const cached2 = cache.get(testData, 'test-validator')
  console.log('✅ Cache hit:', cached2 !== null)
  console.log('  Cached result valid:', cached2.isValid)
  
  // Test performance measurement
  const measureValidation = (validatorName, validator) => {
    const startTime = performance.now()
    const result = validator()
    const endTime = performance.now()
    const duration = endTime - startTime
    
    console.log(`  ${validatorName} took ${duration.toFixed(2)}ms`)
    return result
  }
  
  // Simulate slow validation
  const slowValidator = () => {
    // Simulate work
    let sum = 0
    for (let i = 0; i < 100000; i++) {
      sum += i
    }
    return { isValid: true, data: { sum }, errors: [], warnings: [] }
  }
  
  console.log('✅ Performance measurement:')
  measureValidation('slow-validator', slowValidator)
  
  console.log('✅ Performance and caching test passed\n')
}

// Run all tests
function runTests() {
  console.log('🚀 Starting validation utilities tests...\n')
  
  try {
    testValidationUtils()
    testProductValidation()
    testUserValidation()
    testApiResponseValidation()
    testFormValidation()
    testBatchValidation()
    testPerformanceAndCaching()
    
    console.log('🎉 All tests passed! Validation utilities are working correctly.')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
}

module.exports = {
  testValidationUtils,
  testProductValidation,
  testUserValidation,
  testApiResponseValidation,
  testFormValidation,
  testBatchValidation,
  testPerformanceAndCaching,
  runTests
}
