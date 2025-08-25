import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-maroon-100 text-maroon-700 border-maroon-200',
    secondary: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge
