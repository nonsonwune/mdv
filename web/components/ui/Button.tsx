"use client"

import React, { forwardRef } from 'react'
import { tokens } from '../../lib/design-tokens'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  as?: 'button' | 'a'
  href?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      as = 'button',
      href,
      onClick,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variantStyles = {
      primary: 'bg-maroon-700 text-white border-maroon-700 hover:bg-maroon-800 hover:border-maroon-800',
      secondary: 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400',
      ghost: 'bg-transparent text-neutral-700 border-transparent hover:bg-neutral-100',
      danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700',
      success: 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700',
    }

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs min-h-[32px]',
      md: 'px-4 py-2 text-sm min-h-[40px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
    }

    // Build class names
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      rounded-md border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-maroon-700 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      ${fullWidth ? 'w-full' : ''}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${loading ? 'cursor-wait' : ''}
      ${className}
    `.trim()

    // Loading spinner
    const loadingSpinner = loading && (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )

    const content = (
      <>
        {loading && loadingSpinner}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </>
    )

    // Render as link if href is provided
    if (as === 'a' && href) {
      return (
        <a
          href={href}
          className={baseStyles}
          onClick={onClick as any}
          aria-disabled={disabled || loading}
          {...(props as any)}
        >
          {content}
        </a>
      )
    }

    // Default button rendering
    return (
      <button
        ref={ref}
        type={type}
        className={baseStyles}
        disabled={disabled || loading}
        onClick={onClick}
        aria-busy={loading}
        {...props}
      >
        {content}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
