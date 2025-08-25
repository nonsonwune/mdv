import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = true,
  className = '',
  style = {},
  ...props
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }

  const animationClass = animation ? 'animate-pulse' : ''

  const defaultHeights = {
    text: '1em',
    circular: width || '40px',
    rectangular: '120px',
  }

  return (
    <div
      className={`bg-neutral-200 ${variantClasses[variant]} ${animationClass} ${className}`}
      style={{
        width: width || (variant === 'circular' ? '40px' : '100%'),
        height: height || defaultHeights[variant],
        ...style,
      }}
      {...props}
    />
  )
}

export default Skeleton
