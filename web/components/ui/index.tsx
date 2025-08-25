"use client"

import React, { ReactNode, ButtonHTMLAttributes, HTMLAttributes, useEffect } from "react"
import { createPortal } from "react-dom"

// Button Component
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  }

  const variantClass = `btn-${variant}`
  const sizeClass = sizeClasses[size]

  return (
    <button
      className={`${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}

// Modal Component
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  closeOnOverlayClick?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl"
  }

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: "var(--z-modal)" }}>
      <div
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-lg shadow-2xl w-full ${sizeClasses[size]} animate-slideUp`}
        >
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold" style={{ color: "var(--ink-700)" }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-neutral-100 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Drawer Component
interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  position?: "left" | "right"
  size?: "sm" | "md" | "lg"
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = "right",
  size = "md"
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: "max-w-xs",
    md: "max-w-md",
    lg: "max-w-lg"
  }

  const positionClasses = {
    left: "left-0",
    right: "right-0"
  }

  const animationClass = position === "left" ? "animate-slideInLeft" : "animate-slideInRight"

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: "var(--z-modal)" }}>
      <div
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 ${positionClasses[position]} h-full w-full ${sizeClasses[size]} bg-white shadow-xl flex flex-col ${animationClass}`}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold" style={{ color: "var(--ink-700)" }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-neutral-100 transition-colors"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>,
    document.body
  )
}

// Spinner Component
interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  color?: string
}

export function Spinner({ size = "md", color = "currentColor", className = "", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  }

  return (
    <div className={`inline-block ${className}`} {...props}>
      <svg
        className={`animate-spin ${sizeClasses[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill={color}
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

// Empty State Component
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-neutral-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-2" style={{ color: "var(--ink-700)" }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-4" style={{ color: "var(--ink-600)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Badge Component
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "warning" | "danger" | "neutral"
  size?: "sm" | "md"
}

export function Badge({ variant = "neutral", size = "sm", className = "", children, ...props }: BadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1"
  }

  return (
    <span
      className={`badge badge-${variant} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

// Card Component
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  noPadding?: boolean
}

export function Card({ hoverable = false, noPadding = false, className = "", children, ...props }: CardProps) {
  const hoverClass = hoverable ? "card-hover" : ""
  const paddingClass = noPadding ? "" : "p-4"
  
  return (
    <div
      className={`card ${hoverClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// Skeleton Component
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  animation?: boolean
}

export function Skeleton({
  variant = "text",
  width,
  height,
  animation = true,
  className = "",
  style = {},
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-md"
  }

  const animationClass = animation ? "animate-pulse" : ""

  const defaultHeights = {
    text: "1em",
    circular: width || "40px",
    rectangular: "120px"
  }

  return (
    <div
      className={`bg-neutral-200 ${variantClasses[variant]} ${animationClass} ${className}`}
      style={{
        width: width || (variant === "circular" ? "40px" : "100%"),
        height: height || defaultHeights[variant],
        ...style
      }}
      {...props}
    />
  )
}

// Tabs Component
interface TabsProps {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
}

interface TabProps {
  value: string
  label: string
  children: ReactNode
}

export function Tabs({ value, onChange, children, className = "" }: TabsProps) {
  const tabs = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabProps> =>
      React.isValidElement(child) && child.type === Tab
  )

  return (
    <div className={className}>
      <div className="flex border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.props.value}
            onClick={() => onChange(tab.props.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              value === tab.props.value
                ? "border-maroon-700 text-maroon-700"
                : "border-transparent text-ink-600 hover:text-ink-700"
            }`}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs.find((tab) => tab.props.value === value)?.props.children}
      </div>
    </div>
  )
}

export function Tab({ children }: TabProps) {
  return <>{children}</>
}

// Alert Component
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger"
  title?: string
  closable?: boolean
  onClose?: () => void
}

export function Alert({
  variant = "info",
  title,
  closable = false,
  onClose,
  className = "",
  children,
  ...props
}: AlertProps) {
  const variantClasses = {
    info: "bg-info-light/10 border-info-light text-info-dark",
    success: "bg-success-light/10 border-success text-success-dark",
    warning: "bg-warning-light/10 border-warning text-warning-dark",
    danger: "bg-danger-light/10 border-danger text-danger-dark"
  }

  const icons = {
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    danger: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <div
      className={`border rounded-lg p-4 flex ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <div className="flex-shrink-0 mr-3">{icons[variant]}</div>
      <div className="flex-1">
        {title && <h4 className="font-medium mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
      {closable && (
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-3 p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Close alert"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
