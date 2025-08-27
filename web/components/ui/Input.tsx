import React, { forwardRef, useState } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  variant?: 'default' | 'filled' | 'unstyled'
  inputSize?: 'sm' | 'md' | 'lg'
  as?: 'input' | 'select' | 'textarea'
}

export const Input = forwardRef<any, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      variant = 'default',
      inputSize = 'md',
      className = '',
      id,
      type = 'text',
      disabled = false,
      required = false,
      as = 'input',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const isPassword = type === 'password' && as === 'input'
    const inputType = isPassword && showPassword ? 'text' : type

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    }

    // Variant styles
    const variantStyles = {
      default: `
        border border-neutral-300 bg-white
        hover:border-neutral-400
        focus:border-maroon-700 focus:ring-2 focus:ring-maroon-700/10
        disabled:bg-neutral-50 disabled:border-neutral-200
      `,
      filled: `
        border-0 bg-neutral-100
        hover:bg-neutral-200
        focus:bg-white focus:ring-2 focus:ring-maroon-700
        disabled:bg-neutral-100
      `,
      unstyled: 'border-0 bg-transparent p-0 focus:ring-0',
    }

    // Error styles
    const errorStyles = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
      : ''

    // Build input class names
    const inputStyles = `
      w-full rounded-md transition-all duration-200
      placeholder:text-neutral-400
      focus:outline-none
      disabled:cursor-not-allowed disabled:opacity-50
      ${variantStyles[variant]}
      ${sizeStyles[inputSize]}
      ${errorStyles}
      ${leftIcon && as === 'input' ? 'pl-10' : ''}
      ${((rightIcon && as === 'input') || isPassword) ? 'pr-10' : ''}
      ${className}
    `.trim()

    // Password toggle button
    const passwordToggle = isPassword && (
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    )

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && as === 'input' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          {as === 'input' && (
            <input
              ref={ref}
              id={inputId}
              type={inputType}
              className={inputStyles}
              disabled={disabled}
              required={required}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
              }
              {...props}
            />
          )}

          {as === 'textarea' && (
            <textarea
              ref={ref}
              id={inputId}
              className={inputStyles}
              disabled={disabled}
              required={required}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
              }
              {...(props as any)}
            />
          )}

          {as === 'select' && (
            <select
              ref={ref}
              id={inputId}
              className={inputStyles}
              disabled={disabled}
              required={required}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
              }
              {...(props as any)}
            />
          )}
          
          {rightIcon && as === 'input' && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
          
          {passwordToggle}
        </div>
        
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-red-500">
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
