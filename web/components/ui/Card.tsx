import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
  fullHeight?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  fullHeight = false,
  className = '',
  onClick,
  ...props
}) => {
  // Variant styles
  const variantStyles = {
    default: 'bg-white border border-neutral-200',
    elevated: 'bg-white shadow-md',
    outlined: 'bg-transparent border-2 border-neutral-200',
    ghost: 'bg-transparent',
  }

  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  // Interaction styles
  const interactionStyles = `
    ${hoverable ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}
    ${clickable ? 'cursor-pointer' : ''}
  `

  // Build class names
  const cardStyles = `
    rounded-lg transition-all duration-200
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${interactionStyles}
    ${fullHeight ? 'h-full' : ''}
    ${className}
  `.trim()

  return (
    <div
      className={cardStyles}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable && onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(e as any)
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
