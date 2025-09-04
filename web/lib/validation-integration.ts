/**
 * Validation Integration Examples
 * 
 * This file demonstrates how to integrate the validation utilities
 * across different parts of the application for consistent data validation.
 */

import React from 'react'
import {
  ProductValidation,
  UserValidation,
  ApiResponseValidation,
  FormValidation,
  BatchValidation,
  ValidationUtils,
  withCache,
  type ValidationResult
} from './validation'
import type { Product, User } from './types'

/**
 * API Client with integrated validation
 */
export class ValidatedApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Fetch products with automatic validation
   */
  async fetchProducts(): Promise<ValidationResult<Product[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products`)
      const data = await response.json()

      if (!response.ok) {
        return {
          isValid: false,
          errors: [ValidationUtils.createError('api', `API error: ${response.status}`, 'API_ERROR', data)],
          warnings: []
        }
      }

      // Validate the response structure
      if (!ApiResponseValidation.isValidApiResponse(data)) {
        return {
          isValid: false,
          errors: [ValidationUtils.createError('response', 'Invalid API response format', 'INVALID_RESPONSE', data)],
          warnings: []
        }
      }

      // Validate products data
      return ApiResponseValidation.validateProductsResponse(data.data || data)
    } catch (error) {
      return {
        isValid: false,
        errors: [ValidationUtils.createError('network', 'Network error occurred', 'NETWORK_ERROR', error)],
        warnings: []
      }
    }
  }

  /**
   * Fetch single product with validation
   */
  async fetchProduct(id: number): Promise<ValidationResult<Product>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/${id}`)
      const data = await response.json()

      if (!response.ok) {
        return {
          isValid: false,
          errors: [ValidationUtils.createError('api', `Product not found: ${id}`, 'PRODUCT_NOT_FOUND', data)],
          warnings: []
        }
      }

      return ProductValidation.validateProduct(data.data || data, { sanitize: true })
    } catch (error) {
      return {
        isValid: false,
        errors: [ValidationUtils.createError('network', 'Failed to fetch product', 'NETWORK_ERROR', error)],
        warnings: []
      }
    }
  }

  /**
   * Fetch user profile with validation
   */
  async fetchUserProfile(): Promise<ValidationResult<User>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/profile`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        return {
          isValid: false,
          errors: [ValidationUtils.createError('auth', 'Failed to fetch user profile', 'AUTH_ERROR', data)],
          warnings: []
        }
      }

      return UserValidation.validateUser(data.data || data, { sanitize: true })
    } catch (error) {
      return {
        isValid: false,
        errors: [ValidationUtils.createError('network', 'Network error occurred', 'NETWORK_ERROR', error)],
        warnings: []
      }
    }
  }
}

/**
 * Form validation hook for React components
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, any[]>
) {
  const [values, setValues] = React.useState<T>(initialValues)
  const [errors, setErrors] = React.useState<Record<keyof T, string>>({} as Record<keyof T, string>)
  const [touched, setTouched] = React.useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)

  const validateField = (field: keyof T, value: any): string | null => {
    const rules = validationRules[field] || []
    const result = FormValidation.validateField(value, rules)
    
    if (!result.isValid && result.errors.length > 0) {
      return result.errors[0].message
    }
    
    return null
  }

  const validateForm = (): boolean => {
    const newErrors: Record<keyof T, string> = {} as Record<keyof T, string>
    let isValid = true

    Object.keys(validationRules).forEach((field) => {
      const error = validateField(field as keyof T, values[field])
      if (error) {
        newErrors[field as keyof T] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleChange = (field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    // Validate field if it has been touched
    if (touched[field]) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error || '' }))
    }
  }

  const handleBlur = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    const error = validateField(field, values[field])
    setErrors(prev => ({ ...prev, [field]: error || '' }))
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({} as Record<keyof T, string>)
    setTouched({} as Record<keyof T, boolean>)
  }

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateForm,
    reset,
    isValid: Object.values(errors).every(error => !error)
  }
}

/**
 * Product validation with caching for performance
 */
export const cachedProductValidation = withCache(
  ProductValidation.validateProduct,
  'product-validation'
)

/**
 * User validation with caching
 */
export const cachedUserValidation = withCache(
  UserValidation.validateUser,
  'user-validation'
)

/**
 * Component data validation utilities
 */
export const ComponentValidation = {
  /**
   * Validate props for ProductCard component
   */
  validateProductCardProps(props: any): ValidationResult<{ product: Product }> {
    if (!props || typeof props !== 'object') {
      return {
        isValid: false,
        errors: [ValidationUtils.createError('props', 'Props must be an object', 'INVALID_PROPS', props)],
        warnings: []
      }
    }

    const productValidation = cachedProductValidation(props.product)
    
    if (!productValidation.isValid) {
      return {
        isValid: false,
        errors: [
          ValidationUtils.createError('product', 'Invalid product prop', 'INVALID_PRODUCT_PROP', props.product),
          ...productValidation.errors
        ],
        warnings: productValidation.warnings
      }
    }

    return {
      isValid: true,
      data: { product: productValidation.data! },
      errors: [],
      warnings: productValidation.warnings
    }
  },

  /**
   * Validate props for UserProfile component
   */
  validateUserProfileProps(props: any): ValidationResult<{ user: User }> {
    if (!props || typeof props !== 'object') {
      return {
        isValid: false,
        errors: [ValidationUtils.createError('props', 'Props must be an object', 'INVALID_PROPS', props)],
        warnings: []
      }
    }

    const userValidation = cachedUserValidation(props.user)
    
    if (!userValidation.isValid) {
      return {
        isValid: false,
        errors: [
          ValidationUtils.createError('user', 'Invalid user prop', 'INVALID_USER_PROP', props.user),
          ...userValidation.errors
        ],
        warnings: userValidation.warnings
      }
    }

    return {
      isValid: true,
      data: { user: userValidation.data! },
      errors: [],
      warnings: userValidation.warnings
    }
  }
}

/**
 * localStorage validation utilities
 */
export const StorageValidation = {
  /**
   * Validate and sanitize data before storing in localStorage
   */
  setValidatedItem<T>(key: string, data: T, validator: (data: any) => ValidationResult<T>): boolean {
    const validation = validator(data)
    
    if (!validation.isValid) {
      console.warn(`Failed to store ${key} in localStorage:`, validation.errors)
      return false
    }

    try {
      localStorage.setItem(key, JSON.stringify(validation.data))
      return true
    } catch (error) {
      console.error(`Error storing ${key} in localStorage:`, error)
      return false
    }
  },

  /**
   * Get and validate data from localStorage
   */
  getValidatedItem<T>(key: string, validator: (data: any) => ValidationResult<T>): T | null {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null

      const parsed = JSON.parse(stored)
      const validation = validator(parsed)

      if (!validation.isValid) {
        console.warn(`Invalid data in localStorage for ${key}:`, validation.errors)
        // Remove invalid data
        localStorage.removeItem(key)
        return null
      }

      return validation.data || null
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error)
      localStorage.removeItem(key)
      return null
    }
  }
}

/**
 * Error boundary validation utilities
 */
export const ErrorBoundaryValidation = {
  /**
   * Validate error information for error boundaries
   */
  validateError(error: any): ValidationResult<{ message: string; stack?: string; componentStack?: string }> {
    const errors: any[] = []
    const warnings: any[] = []

    if (!error) {
      errors.push(ValidationUtils.createError('error', 'Error object is required', 'MISSING_ERROR'))
      return { isValid: false, errors, warnings }
    }

    const message = error.message || error.toString() || 'Unknown error'
    const stack = error.stack || undefined
    const componentStack = error.componentStack || undefined

    return {
      isValid: true,
      data: { message, stack, componentStack },
      errors,
      warnings
    }
  }
}

/**
 * Global validation configuration
 */
export const ValidationConfig = {
  // Enable/disable validation in production
  enableValidation: process.env.NODE_ENV !== 'production' || process.env.ENABLE_VALIDATION === 'true',
  
  // Enable/disable validation caching
  enableCaching: true,
  
  // Validation performance monitoring
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
  
  // Log validation errors to console
  logValidationErrors: process.env.NODE_ENV === 'development'
}

/**
 * Validation performance monitor
 */
export class ValidationPerformanceMonitor {
  private static instance: ValidationPerformanceMonitor
  private metrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map()

  static getInstance(): ValidationPerformanceMonitor {
    if (!ValidationPerformanceMonitor.instance) {
      ValidationPerformanceMonitor.instance = new ValidationPerformanceMonitor()
    }
    return ValidationPerformanceMonitor.instance
  }

  measureValidation<T>(validatorName: string, validator: () => ValidationResult<T>): ValidationResult<T> {
    if (!ValidationConfig.enablePerformanceMonitoring) {
      return validator()
    }

    const startTime = performance.now()
    const result = validator()
    const endTime = performance.now()
    const duration = endTime - startTime

    const existing = this.metrics.get(validatorName) || { count: 0, totalTime: 0, avgTime: 0 }
    const newCount = existing.count + 1
    const newTotalTime = existing.totalTime + duration
    const newAvgTime = newTotalTime / newCount

    this.metrics.set(validatorName, {
      count: newCount,
      totalTime: newTotalTime,
      avgTime: newAvgTime
    })

    if (duration > 10) { // Log slow validations (>10ms)
      console.warn(`Slow validation detected: ${validatorName} took ${duration.toFixed(2)}ms`)
    }

    return result
  }

  getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.metrics)
  }

  reset(): void {
    this.metrics.clear()
  }
}

// Global performance monitor instance
export const validationPerformanceMonitor = ValidationPerformanceMonitor.getInstance()
