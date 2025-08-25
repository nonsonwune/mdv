import React from 'react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  size = 'md',
  className = '',
}) => {
  // Size styles
  const sizeStyles = {
    sm: {
      container: 'py-8',
      icon: 'mb-3 text-3xl',
      title: 'text-base',
      description: 'text-xs',
      action: 'mt-4',
    },
    md: {
      container: 'py-12',
      icon: 'mb-4 text-4xl',
      title: 'text-lg',
      description: 'text-sm',
      action: 'mt-6',
    },
    lg: {
      container: 'py-16',
      icon: 'mb-6 text-5xl',
      title: 'text-xl',
      description: 'text-base',
      action: 'mt-8',
    },
  }

  const styles = sizeStyles[size]

  return (
    <div className={`text-center ${styles.container} ${className}`}>
      {icon && (
        <div className={`${styles.icon} text-neutral-400 flex justify-center`}>
          {icon}
        </div>
      )}
      
      <h3 className={`${styles.title} font-medium text-neutral-900 mb-2`}>
        {title}
      </h3>
      
      {description && (
        <p className={`${styles.description} text-neutral-600 max-w-md mx-auto`}>
          {description}
        </p>
      )}
      
      {action && (
        <div className={`${styles.action} flex justify-center`}>
          {action}
        </div>
      )}
    </div>
  )
}

export default EmptyState
