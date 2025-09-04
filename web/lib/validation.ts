/**
 * Comprehensive Data Validation Utilities
 * 
 * This module provides type guards, schema validation, and data validation utilities
 * for ensuring data integrity across the frontend application.
 * 
 * Features:
 * - Type guards for runtime type checking
 * - Schema validation for API responses
 * - Data sanitization and normalization
 * - Error handling and validation reporting
 * - Performance-optimized validation functions
 */

import type { 
  Product, 
  Variant, 
  ProductImage, 
  User, 
  Order, 
  OrderItem,
  Category,
  CartItem,
  Address
} from './types'

/**
 * Validation result interface
 */
export interface ValidationResult<T = any> {
  isValid: boolean
  data?: T
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface ValidationWarning {
  field: string
  message: string
  value?: any
}

/**
 * Validation options
 */
export interface ValidationOptions {
  strict?: boolean // Strict mode fails on warnings
  sanitize?: boolean // Automatically sanitize data
  allowPartial?: boolean // Allow partial objects
  maxDepth?: number // Maximum validation depth
}

/**
 * Base validation utilities
 */
export const ValidationUtils = {
  /**
   * Check if value is a non-empty string
   */
  isNonEmptyString(value: any): value is string {
    return typeof value === 'string' && value.trim().length > 0
  },

  /**
   * Check if value is a positive number
   */
  isPositiveNumber(value: any): value is number {
    return typeof value === 'number' && value > 0 && !isNaN(value) && isFinite(value)
  },

  /**
   * Check if value is a non-negative number
   */
  isNonNegativeNumber(value: any): value is number {
    return typeof value === 'number' && value >= 0 && !isNaN(value) && isFinite(value)
  },

  /**
   * Check if value is a valid integer
   */
  isInteger(value: any): value is number {
    return typeof value === 'number' && Number.isInteger(value)
  },

  /**
   * Check if value is a valid date string
   */
  isValidDateString(value: any): value is string {
    if (typeof value !== 'string') return false
    const date = new Date(value)
    return !isNaN(date.getTime())
  },

  /**
   * Check if value is a valid URL
   */
  isValidUrl(value: any): value is string {
    if (typeof value !== 'string') return false
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  },

  /**
   * Check if value is a valid email
   */
  isValidEmail(value: any): value is string {
    if (typeof value !== 'string') return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  },

  /**
   * Check if array is non-empty
   */
  isNonEmptyArray<T>(value: any): value is T[] {
    return Array.isArray(value) && value.length > 0
  },

  /**
   * Sanitize string by trimming and removing dangerous characters
   */
  sanitizeString(value: string): string {
    return value.trim().replace(/[<>]/g, '')
  },

  /**
   * Create validation error
   */
  createError(field: string, message: string, code: string, value?: any): ValidationError {
    return { field, message, code, value }
  },

  /**
   * Create validation warning
   */
  createWarning(field: string, message: string, value?: any): ValidationWarning {
    return { field, message, value }
  }
}

/**
 * Product validation utilities
 */
export const ProductValidation = {
  /**
   * Validate ProductImage type guard
   */
  isValidProductImage(value: any): value is ProductImage {
    return (
      value &&
      typeof value === 'object' &&
      ValidationUtils.isInteger(value.id) &&
      ValidationUtils.isInteger(value.product_id) &&
      ValidationUtils.isValidUrl(value.url) &&
      (value.alt_text === null || ValidationUtils.isNonEmptyString(value.alt_text)) &&
      ValidationUtils.isPositiveNumber(value.width) &&
      ValidationUtils.isPositiveNumber(value.height) &&
      ValidationUtils.isValidDateString(value.created_at) &&
      ValidationUtils.isValidDateString(value.updated_at)
    )
  },

  /**
   * Validate Variant type guard
   */
  isValidVariant(value: any): value is Variant {
    return (
      value &&
      typeof value === 'object' &&
      ValidationUtils.isInteger(value.id) &&
      ValidationUtils.isInteger(value.product_id) &&
      ValidationUtils.isNonEmptyString(value.title) &&
      ValidationUtils.isNonNegativeNumber(value.price) &&
      (value.compare_at_price === null || ValidationUtils.isNonNegativeNumber(value.compare_at_price)) &&
      ValidationUtils.isNonNegativeNumber(value.inventory_quantity) &&
      ValidationUtils.isNonEmptyString(value.sku) &&
      ValidationUtils.isNonNegativeNumber(value.weight) &&
      typeof value.requires_shipping === 'boolean' &&
      typeof value.taxable === 'boolean' &&
      ValidationUtils.isValidDateString(value.created_at) &&
      ValidationUtils.isValidDateString(value.updated_at)
    )
  },

  /**
   * Validate Product type guard
   */
  isValidProduct(value: any): value is Product {
    return (
      value &&
      typeof value === 'object' &&
      ValidationUtils.isInteger(value.id) &&
      ValidationUtils.isNonEmptyString(value.title) &&
      ValidationUtils.isNonEmptyString(value.slug) &&
      ValidationUtils.isNonEmptyString(value.description) &&
      ValidationUtils.isNonEmptyArray(value.variants) &&
      value.variants.every(ProductValidation.isValidVariant) &&
      ValidationUtils.isNonEmptyArray(value.images) &&
      value.images.every(ProductValidation.isValidProductImage) &&
      (value.category_id === null || ValidationUtils.isInteger(value.category_id)) &&
      (value.compare_at_price === null || ValidationUtils.isNonNegativeNumber(value.compare_at_price)) &&
      ValidationUtils.isValidDateString(value.created_at) &&
      ValidationUtils.isValidDateString(value.updated_at)
    )
  },

  /**
   * Comprehensive product validation with detailed error reporting
   */
  validateProduct(value: any, options: ValidationOptions = {}): ValidationResult<Product> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!value || typeof value !== 'object') {
      errors.push(ValidationUtils.createError('product', 'Product must be an object', 'INVALID_TYPE', value))
      return { isValid: false, errors, warnings }
    }

    // Validate required fields
    if (!ValidationUtils.isInteger(value.id)) {
      errors.push(ValidationUtils.createError('id', 'Product ID must be a positive integer', 'INVALID_ID', value.id))
    }

    if (!ValidationUtils.isNonEmptyString(value.title)) {
      errors.push(ValidationUtils.createError('title', 'Product title must be a non-empty string', 'INVALID_TITLE', value.title))
    }

    if (!ValidationUtils.isNonEmptyString(value.slug)) {
      errors.push(ValidationUtils.createError('slug', 'Product slug must be a non-empty string', 'INVALID_SLUG', value.slug))
    }

    if (!ValidationUtils.isNonEmptyString(value.description)) {
      errors.push(ValidationUtils.createError('description', 'Product description must be a non-empty string', 'INVALID_DESCRIPTION', value.description))
    }

    // Validate variants
    if (!ValidationUtils.isNonEmptyArray(value.variants)) {
      errors.push(ValidationUtils.createError('variants', 'Product must have at least one variant', 'NO_VARIANTS', value.variants))
    } else {
      value.variants.forEach((variant: any, index: number) => {
        if (!ProductValidation.isValidVariant(variant)) {
          errors.push(ValidationUtils.createError(`variants[${index}]`, 'Invalid variant data', 'INVALID_VARIANT', variant))
        }
      })
    }

    // Validate images
    if (!ValidationUtils.isNonEmptyArray(value.images)) {
      warnings.push(ValidationUtils.createWarning('images', 'Product should have at least one image', value.images))
    } else {
      value.images.forEach((image: any, index: number) => {
        if (!ProductValidation.isValidProductImage(image)) {
          errors.push(ValidationUtils.createError(`images[${index}]`, 'Invalid image data', 'INVALID_IMAGE', image))
        }
      })
    }

    // Validate optional fields
    if (value.category_id !== null && !ValidationUtils.isInteger(value.category_id)) {
      errors.push(ValidationUtils.createError('category_id', 'Category ID must be an integer or null', 'INVALID_CATEGORY_ID', value.category_id))
    }

    if (value.compare_at_price !== null && !ValidationUtils.isNonNegativeNumber(value.compare_at_price)) {
      errors.push(ValidationUtils.createError('compare_at_price', 'Compare at price must be a non-negative number or null', 'INVALID_COMPARE_PRICE', value.compare_at_price))
    }

    // Validate timestamps
    if (!ValidationUtils.isValidDateString(value.created_at)) {
      errors.push(ValidationUtils.createError('created_at', 'Created at must be a valid date string', 'INVALID_CREATED_AT', value.created_at))
    }

    if (!ValidationUtils.isValidDateString(value.updated_at)) {
      errors.push(ValidationUtils.createError('updated_at', 'Updated at must be a valid date string', 'INVALID_UPDATED_AT', value.updated_at))
    }

    // Sanitize data if requested
    let sanitizedData = value
    if (options.sanitize && errors.length === 0) {
      sanitizedData = {
        ...value,
        title: ValidationUtils.sanitizeString(value.title),
        description: ValidationUtils.sanitizeString(value.description)
      }
    }

    const isValid = errors.length === 0 && (!options.strict || warnings.length === 0)

    return {
      isValid,
      data: isValid ? sanitizedData : undefined,
      errors,
      warnings
    }
  }
}

/**
 * Order validation utilities
 */
export const OrderValidation = {
  /**
   * Validate OrderItem type guard
   */
  isValidOrderItem(value: any): value is OrderItem {
    return (
      value &&
      typeof value === 'object' &&
      ValidationUtils.isInteger(value.id) &&
      ValidationUtils.isInteger(value.order_id) &&
      ValidationUtils.isInteger(value.variant_id) &&
      ValidationUtils.isPositiveNumber(value.quantity) &&
      ValidationUtils.isNonNegativeNumber(value.price) &&
      ValidationUtils.isValidDateString(value.created_at) &&
      ValidationUtils.isValidDateString(value.updated_at)
    )
  },

  /**
   * Validate Order type guard
   */
  isValidOrder(value: any): value is Order {
    return (
      value &&
      typeof value === 'object' &&
      ValidationUtils.isInteger(value.id) &&
      ValidationUtils.isInteger(value.user_id) &&
      ValidationUtils.isNonEmptyString(value.status) &&
      ValidationUtils.isNonNegativeNumber(value.total_amount) &&
      ValidationUtils.isNonNegativeNumber(value.subtotal) &&
      ValidationUtils.isNonNegativeNumber(value.tax_amount) &&
      ValidationUtils.isNonNegativeNumber(value.shipping_amount) &&
      ValidationUtils.isNonEmptyArray(value.items) &&
      value.items.every(OrderValidation.isValidOrderItem) &&
      ValidationUtils.isValidDateString(value.created_at) &&
      ValidationUtils.isValidDateString(value.updated_at)
    )
  }
}

/**
 * Address validation utilities
 */
export const AddressValidation = {
  /**
   * Validate Address type guard
   */
  isValidAddress(value: any): value is Address {
    return (
      value &&
      typeof value === 'object' &&
      ValidationUtils.isInteger(value.id) &&
      ValidationUtils.isInteger(value.user_id) &&
      ValidationUtils.isNonEmptyString(value.first_name) &&
      ValidationUtils.isNonEmptyString(value.last_name) &&
      ValidationUtils.isNonEmptyString(value.address_line_1) &&
      ValidationUtils.isNonEmptyString(value.city) &&
      ValidationUtils.isNonEmptyString(value.state) &&
      ValidationUtils.isNonEmptyString(value.postal_code) &&
      ValidationUtils.isNonEmptyString(value.country) &&
      typeof value.is_default === 'boolean' &&
      ValidationUtils.isValidDateString(value.created_at) &&
      ValidationUtils.isValidDateString(value.updated_at)
    )
  }
}

/**
 * API Response validation utilities
 */
export const ApiResponseValidation = {
  /**
   * Validate API response structure
   */
  isValidApiResponse<T>(value: any, dataValidator?: (data: any) => boolean): value is { data: T; success: boolean } {
    if (!value || typeof value !== 'object') return false

    if (typeof value.success !== 'boolean') return false

    if (value.success) {
      return dataValidator ? dataValidator(value.data) : value.data !== undefined
    } else {
      return typeof value.error === 'string' || (value.error && typeof value.error.message === 'string')
    }
  },

  /**
   * Validate paginated API response
   */
  isValidPaginatedResponse<T>(value: any, itemValidator?: (item: any) => boolean): boolean {
    if (!value || typeof value !== 'object') return false

    return (
      Array.isArray(value.data) &&
      (itemValidator ? value.data.every(itemValidator) : true) &&
      typeof value.total === 'number' &&
      typeof value.page === 'number' &&
      typeof value.per_page === 'number' &&
      typeof value.total_pages === 'number'
    )
  },

  /**
   * Validate products API response
   */
  validateProductsResponse(value: any): ValidationResult<Product[]> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!Array.isArray(value)) {
      errors.push(ValidationUtils.createError('products', 'Products response must be an array', 'INVALID_TYPE', value))
      return { isValid: false, errors, warnings }
    }

    const validProducts: Product[] = []
    value.forEach((product: any, index: number) => {
      const validation = ProductValidation.validateProduct(product)
      if (validation.isValid && validation.data) {
        validProducts.push(validation.data)
      } else {
        errors.push(ValidationUtils.createError(`products[${index}]`, 'Invalid product in response', 'INVALID_PRODUCT', product))
        errors.push(...validation.errors)
      }
      warnings.push(...validation.warnings)
    })

    return {
      isValid: errors.length === 0,
      data: validProducts,
      errors,
      warnings
    }
  }
}

/**
 * Form validation utilities
 */
export const FormValidation = {
  /**
   * Validate form field
   */
  validateField(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    for (const rule of rules) {
      const result = rule.validator(value)
      if (!result.isValid) {
        if (rule.severity === 'error') {
          errors.push(ValidationUtils.createError(rule.field, rule.message, rule.code, value))
        } else {
          warnings.push(ValidationUtils.createWarning(rule.field, rule.message, value))
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  },

  /**
   * Common validation rules
   */
  rules: {
    required: (field: string): ValidationRule => ({
      field,
      validator: (value: any) => ({ isValid: value !== null && value !== undefined && value !== '' }),
      message: `${field} is required`,
      code: 'REQUIRED',
      severity: 'error'
    }),

    email: (field: string): ValidationRule => ({
      field,
      validator: (value: any) => ({ isValid: !value || ValidationUtils.isValidEmail(value) }),
      message: `${field} must be a valid email address`,
      code: 'INVALID_EMAIL',
      severity: 'error'
    }),

    minLength: (field: string, min: number): ValidationRule => ({
      field,
      validator: (value: any) => ({ isValid: !value || (typeof value === 'string' && value.length >= min) }),
      message: `${field} must be at least ${min} characters long`,
      code: 'MIN_LENGTH',
      severity: 'error'
    }),

    maxLength: (field: string, max: number): ValidationRule => ({
      field,
      validator: (value: any) => ({ isValid: !value || (typeof value === 'string' && value.length <= max) }),
      message: `${field} must be no more than ${max} characters long`,
      code: 'MAX_LENGTH',
      severity: 'error'
    }),

    positiveNumber: (field: string): ValidationRule => ({
      field,
      validator: (value: any) => ({ isValid: !value || ValidationUtils.isPositiveNumber(value) }),
      message: `${field} must be a positive number`,
      code: 'POSITIVE_NUMBER',
      severity: 'error'
    })
  }
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  field: string
  validator: (value: any) => { isValid: boolean }
  message: string
  code: string
  severity: 'error' | 'warning'
}

/**
 * Batch validation utilities
 */
export const BatchValidation = {
  /**
   * Validate multiple items with the same validator
   */
  validateBatch<T>(items: any[], validator: (item: any) => ValidationResult<T>): ValidationResult<T[]> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const validItems: T[] = []

    items.forEach((item, index) => {
      const result = validator(item)
      if (result.isValid && result.data) {
        validItems.push(result.data)
      } else {
        errors.push(ValidationUtils.createError(`items[${index}]`, 'Invalid item in batch', 'INVALID_ITEM', item))
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
  },

  /**
   * Validate object with multiple fields
   */
  validateObject(obj: Record<string, any>, fieldValidators: Record<string, ValidationRule[]>): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    Object.entries(fieldValidators).forEach(([field, rules]) => {
      const result = FormValidation.validateField(obj[field], rules)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    })

    return {
      isValid: errors.length === 0,
      data: obj,
      errors,
      warnings
    }
  }
}

/**
 * Performance-optimized validation cache
 */
class ValidationCache {
  private cache = new Map<string, ValidationResult>()
  private maxSize = 1000
  private ttl = 5 * 60 * 1000 // 5 minutes

  private generateKey(data: any, validator: string): string {
    return `${validator}:${JSON.stringify(data)}`
  }

  get<T>(data: any, validator: string): ValidationResult<T> | null {
    const key = this.generateKey(data, validator)
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached as ValidationResult<T>
    }

    this.cache.delete(key)
    return null
  }

  set<T>(data: any, validator: string, result: ValidationResult<T>): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
      entries.slice(0, Math.floor(this.maxSize * 0.2)).forEach(([key]) => {
        this.cache.delete(key)
      })
    }

    const key = this.generateKey(data, validator)
    this.cache.set(key, { ...result, timestamp: Date.now() } as any)
  }

  clear(): void {
    this.cache.clear()
  }
}

// Global validation cache instance
export const validationCache = new ValidationCache()

/**
 * Cached validation wrapper
 */
export function withCache<T>(
  validator: (data: any) => ValidationResult<T>,
  validatorName: string
) {
  return (data: any): ValidationResult<T> => {
    const cached = validationCache.get<T>(data, validatorName)
    if (cached) {
      return cached
    }

    const result = validator(data)
    validationCache.set(data, validatorName, result)
    return result
  }
}

/**
 * User validation utilities
 */
export const UserValidation = {
  /**
   * Validate User type guard
   */
  isValidUser(value: any): value is User {
    return (
      value &&
      typeof value === 'object' &&
      ValidationUtils.isInteger(value.id) &&
      ValidationUtils.isValidEmail(value.email) &&
      ValidationUtils.isNonEmptyString(value.first_name) &&
      ValidationUtils.isNonEmptyString(value.last_name) &&
      typeof value.is_active === 'boolean' &&
      ValidationUtils.isValidDateString(value.created_at) &&
      ValidationUtils.isValidDateString(value.updated_at)
    )
  },

  /**
   * Comprehensive user validation
   */
  validateUser(value: any, options: ValidationOptions = {}): ValidationResult<User> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!value || typeof value !== 'object') {
      errors.push(ValidationUtils.createError('user', 'User must be an object', 'INVALID_TYPE', value))
      return { isValid: false, errors, warnings }
    }

    // Validate required fields
    if (!ValidationUtils.isInteger(value.id)) {
      errors.push(ValidationUtils.createError('id', 'User ID must be a positive integer', 'INVALID_ID', value.id))
    }

    if (!ValidationUtils.isValidEmail(value.email)) {
      errors.push(ValidationUtils.createError('email', 'Email must be a valid email address', 'INVALID_EMAIL', value.email))
    }

    if (!ValidationUtils.isNonEmptyString(value.first_name)) {
      errors.push(ValidationUtils.createError('first_name', 'First name must be a non-empty string', 'INVALID_FIRST_NAME', value.first_name))
    }

    if (!ValidationUtils.isNonEmptyString(value.last_name)) {
      errors.push(ValidationUtils.createError('last_name', 'Last name must be a non-empty string', 'INVALID_LAST_NAME', value.last_name))
    }

    if (typeof value.is_active !== 'boolean') {
      errors.push(ValidationUtils.createError('is_active', 'Is active must be a boolean', 'INVALID_IS_ACTIVE', value.is_active))
    }

    // Validate timestamps
    if (!ValidationUtils.isValidDateString(value.created_at)) {
      errors.push(ValidationUtils.createError('created_at', 'Created at must be a valid date string', 'INVALID_CREATED_AT', value.created_at))
    }

    if (!ValidationUtils.isValidDateString(value.updated_at)) {
      errors.push(ValidationUtils.createError('updated_at', 'Updated at must be a valid date string', 'INVALID_UPDATED_AT', value.updated_at))
    }

    // Sanitize data if requested
    let sanitizedData = value
    if (options.sanitize && errors.length === 0) {
      sanitizedData = {
        ...value,
        first_name: ValidationUtils.sanitizeString(value.first_name),
        last_name: ValidationUtils.sanitizeString(value.last_name)
      }
    }

    const isValid = errors.length === 0 && (!options.strict || warnings.length === 0)

    return {
      isValid,
      data: isValid ? sanitizedData : undefined,
      errors,
      warnings
    }
  }
}
