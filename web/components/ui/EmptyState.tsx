import React from 'react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  variant?: 'default' | 'illustration' | 'minimal'
  illustration?: 'shopping' | 'search' | 'collection' | 'coming-soon'
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  size = 'md',
  className = '',
  variant = 'default',
  illustration = 'shopping'
}) => {
  // Size styles
  const sizeStyles = {
    sm: {
      container: 'py-8',
      icon: 'mb-3 w-12 h-12',
      title: 'text-base',
      description: 'text-sm',
      action: 'mt-4',
      illustration: 'w-32 h-32'
    },
    md: {
      container: 'py-12',
      icon: 'mb-4 w-16 h-16',
      title: 'text-xl',
      description: 'text-base',
      action: 'mt-6',
      illustration: 'w-48 h-48'
    },
    lg: {
      container: 'py-16',
      icon: 'mb-6 w-24 h-24',
      title: 'text-2xl',
      description: 'text-lg',
      action: 'mt-8',
      illustration: 'w-64 h-64'
    },
  }

  const styles = sizeStyles[size]

  // Illustration components
  const illustrations = {
    shopping: (
      <div className={`${styles.illustration} mx-auto mb-6 relative`}>
        <div className="absolute inset-0 bg-gradient-to-br from-maroon-100 to-maroon-200 rounded-full opacity-20"></div>
        <div className="relative w-full h-full flex items-center justify-center">
          <svg className="w-2/3 h-2/3 text-maroon-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-maroon-700 rounded-full opacity-80"></div>
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-maroon-500 rounded-full opacity-60"></div>
      </div>
    ),
    search: (
      <div className={`${styles.illustration} mx-auto mb-6 relative`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full opacity-20"></div>
        <div className="relative w-full h-full flex items-center justify-center">
          <svg className="w-2/3 h-2/3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    ),
    collection: (
      <div className={`${styles.illustration} mx-auto mb-6 relative`}>
        <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-200 rounded-full opacity-20"></div>
        <div className="relative w-full h-full flex items-center justify-center">
          <svg className="w-2/3 h-2/3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
      </div>
    ),
    'coming-soon': (
      <div className={`${styles.illustration} mx-auto mb-6 relative`}>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full opacity-20"></div>
        <div className="relative w-full h-full flex items-center justify-center">
          <svg className="w-2/3 h-2/3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className={`text-center ${styles.container} ${className}`}>
      {variant === 'illustration' ? (
        illustrations[illustration]
      ) : icon ? (
        <div className={`${styles.icon} text-neutral-400 flex justify-center mx-auto bg-neutral-100 rounded-full items-center`}>
          {icon}
        </div>
      ) : null}

      <h3 className={`${styles.title} font-semibold text-ink-700 mb-3`}>
        {title}
      </h3>

      {description && (
        <p className={`${styles.description} text-ink-600 max-w-lg mx-auto leading-relaxed`}>
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
