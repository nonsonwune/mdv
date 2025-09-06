'use client'

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Mobile-optimized input component
interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, label, error, helperText, icon, type = 'text', ...props }, ref) => {
    // Optimize input types for mobile keyboards
    const getOptimizedType = (inputType: string) => {
      switch (inputType) {
        case 'email':
          return 'email'
        case 'tel':
        case 'phone':
          return 'tel'
        case 'number':
          return 'number'
        case 'url':
          return 'url'
        default:
          return 'text'
      }
    }

    const optimizedType = getOptimizedType(type)

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-ink-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500">
              {icon}
            </div>
          )}
          <input
            type={optimizedType}
            className={cn(
              // Base styles
              "w-full rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-base transition-all duration-200",
              // Mobile optimizations
              "min-h-[48px] text-[16px]", // Prevent zoom on iOS
              // Focus states
              "focus:border-maroon-600 focus:ring-2 focus:ring-maroon-600/20 focus:outline-none",
              // Error states
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              // Icon padding
              icon && "pl-10",
              className
            )}
            ref={ref}
            autoComplete={getAutoComplete(optimizedType, props.name)}
            autoCapitalize={getAutoCapitalize(optimizedType)}
            autoCorrect={getAutoCorrect(optimizedType)}
            spellCheck={getSpellCheck(optimizedType)}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-neutral-600">{helperText}</p>
        )}
      </div>
    )
  }
)

MobileInput.displayName = 'MobileInput'

// Mobile-optimized textarea component
interface MobileTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const MobileTextarea = forwardRef<HTMLTextAreaElement, MobileTextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-ink-700 mb-2">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            // Base styles
            "w-full rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-base transition-all duration-200",
            // Mobile optimizations
            "min-h-[120px] text-[16px] resize-y",
            // Focus states
            "focus:border-maroon-600 focus:ring-2 focus:ring-maroon-600/20 focus:outline-none",
            // Error states
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-neutral-600">{helperText}</p>
        )}
      </div>
    )
  }
)

MobileTextarea.displayName = 'MobileTextarea'

// Mobile-optimized select component
interface MobileSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: { value: string; label: string }[]
}

export const MobileSelect = forwardRef<HTMLSelectElement, MobileSelectProps>(
  ({ className, label, error, helperText, options, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-ink-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            className={cn(
              // Base styles
              "w-full rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-base transition-all duration-200 appearance-none",
              // Mobile optimizations
              "min-h-[48px] text-[16px]",
              // Focus states
              "focus:border-maroon-600 focus:ring-2 focus:ring-maroon-600/20 focus:outline-none",
              // Error states
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            ref={ref}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-neutral-600">{helperText}</p>
        )}
      </div>
    )
  }
)

MobileSelect.displayName = 'MobileSelect'

// Mobile-optimized button component
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, icon, children, disabled, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    
    const variants = {
      primary: "bg-maroon-700 text-white hover:bg-maroon-800 active:bg-maroon-900 focus:ring-maroon-600 shadow-sm hover:shadow-md active:shadow-sm transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none",
      secondary: "bg-white text-ink-700 border-2 border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 focus:ring-neutral-500",
      ghost: "bg-transparent text-ink-700 hover:bg-neutral-100 focus:ring-neutral-500",
      danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500"
    }
    
    const sizes = {
      sm: "px-4 py-2 text-sm min-h-[40px]",
      md: "px-6 py-3 text-base min-h-[48px]",
      lg: "px-8 py-4 text-lg min-h-[56px]"
    }

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </>
        ) : (
          <>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
          </>
        )}
      </button>
    )
  }
)

MobileButton.displayName = 'MobileButton'

// Helper functions for mobile input optimization
function getAutoComplete(type: string, name?: string): string {
  if (name) {
    const nameMap: Record<string, string> = {
      email: 'email',
      password: 'current-password',
      'new-password': 'new-password',
      'confirm-password': 'new-password',
      'first-name': 'given-name',
      'last-name': 'family-name',
      name: 'name',
      phone: 'tel',
      address: 'street-address',
      city: 'address-level2',
      state: 'address-level1',
      'postal-code': 'postal-code',
      country: 'country'
    }
    return nameMap[name] || 'off'
  }
  
  const typeMap: Record<string, string> = {
    email: 'email',
    tel: 'tel',
    url: 'url'
  }
  return typeMap[type] || 'off'
}

function getAutoCapitalize(type: string): string {
  return ['email', 'tel', 'url', 'password'].includes(type) ? 'off' : 'sentences'
}

function getAutoCorrect(type: string): string {
  return ['email', 'tel', 'url', 'password'].includes(type) ? 'off' : 'on'
}

function getSpellCheck(type: string): boolean {
  return !['email', 'tel', 'url', 'password', 'number'].includes(type)
}
