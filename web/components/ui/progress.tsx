/**
 * Progress indicator components for showing loading states and progress
 */

import React from 'react'

interface ProgressBarProps {
  value: number // 0-100
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  className?: string
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
}

const variantClasses = {
  primary: 'bg-maroon-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  error: 'bg-red-600'
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-300 ease-out ${variantClasses[variant]}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}

/**
 * Circular progress indicator
 */
interface CircularProgressProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  variant?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  className?: string
}

export function CircularProgress({
  value,
  size = 40,
  strokeWidth = 4,
  variant = 'primary',
  showLabel = false,
  className = ''
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = Math.min(Math.max(value, 0), 100)
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const colorClasses = {
    primary: 'text-maroon-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-300 ease-out ${colorClasses[variant]}`}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-medium text-gray-700">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

/**
 * Step progress indicator
 */
interface Step {
  id: string
  title: string
  description?: string
  status: 'pending' | 'current' | 'completed' | 'error'
}

interface StepProgressProps {
  steps: Step[]
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function StepProgress({
  steps,
  orientation = 'horizontal',
  className = ''
}: StepProgressProps) {
  const getStepIcon = (status: Step['status'], index: number) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'current':
        return (
          <div className="w-8 h-8 bg-maroon-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">{index + 1}</span>
          </div>
        )
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )
      default: // pending
        return (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-sm font-medium">{index + 1}</span>
          </div>
        )
    }
  }

  const getStepTextColor = (status: Step['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'current':
        return 'text-maroon-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            <div className="flex-shrink-0">
              {getStepIcon(step.status, index)}
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-sm font-medium ${getStepTextColor(step.status)}`}>
                {step.title}
              </h3>
              {step.description && (
                <p className="mt-1 text-sm text-gray-500">
                  {step.description}
                </p>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className="absolute left-4 mt-8 w-0.5 h-4 bg-gray-300" />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            {getStepIcon(step.status, index)}
            <div className="mt-2 text-center">
              <h3 className={`text-xs font-medium ${getStepTextColor(step.status)}`}>
                {step.title}
              </h3>
              {step.description && (
                <p className="mt-1 text-xs text-gray-500">
                  {step.description}
                </p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 bg-gray-300 mx-4" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

/**
 * Indeterminate progress indicator
 */
interface IndeterminateProgressProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'success' | 'warning' | 'error'
  className?: string
}

export function IndeterminateProgress({
  size = 'md',
  variant = 'primary',
  className = ''
}: IndeterminateProgressProps) {
  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full ${variantClasses[variant]} animate-pulse`}
        style={{
          animation: 'indeterminate 2s infinite linear',
          background: `linear-gradient(90deg, transparent, currentColor, transparent)`,
          width: '50%'
        }}
      />
      <style jsx>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  )
}

/**
 * Upload progress component
 */
interface UploadProgressProps {
  files: Array<{
    name: string
    progress: number
    status: 'uploading' | 'completed' | 'error'
    error?: string
  }>
  className?: string
}

export function UploadProgress({ files, className = '' }: UploadProgressProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {files.map((file, index) => (
        <div key={index} className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 truncate">
              {file.name}
            </span>
            <span className="text-xs text-gray-500">
              {file.status === 'completed' ? 'Complete' : 
               file.status === 'error' ? 'Failed' : 
               `${Math.round(file.progress)}%`}
            </span>
          </div>
          <ProgressBar
            value={file.progress}
            variant={
              file.status === 'completed' ? 'success' :
              file.status === 'error' ? 'error' : 'primary'
            }
            size="sm"
          />
          {file.error && (
            <p className="mt-1 text-xs text-red-600">{file.error}</p>
          )}
        </div>
      ))}
    </div>
  )
}
