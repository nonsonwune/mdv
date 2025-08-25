"use client"

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
  }

  const animationClass = position === 'left' ? 'animate-slide-in-left' : 'animate-slide-in-right'

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 ${positionClasses[position]} h-full w-full ${sizeClasses[size]} bg-white shadow-xl flex flex-col ${animationClass}`}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">
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

export default Drawer
