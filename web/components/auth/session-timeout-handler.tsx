/**
 * Session timeout handler component that manages user sessions
 * and provides automatic logout functionality.
 */

import React, { useEffect, useState } from 'react'
import { useSessionTimeout, useAutoSessionRenewal } from '../../lib/session-manager'
import { useAuth } from '../../lib/auth-context'

interface SessionTimeoutHandlerProps {
  children: React.ReactNode
  warningTime?: number // Minutes before expiry to show warning
  maxIdleTime?: number // Minutes of inactivity before logout
  autoRenewal?: boolean // Enable automatic session renewal
}

export function SessionTimeoutHandler({
  children,
  warningTime = 5,
  maxIdleTime = 30,
  autoRenewal = true
}: SessionTimeoutHandlerProps) {
  const { user } = useAuth()
  const [isClient, setIsClient] = useState(false)

  // Initialize session timeout management
  const sessionManager = useSessionTimeout({
    warningTime,
    maxIdleTime,
    checkInterval: 60, // Check every minute
    renewalThreshold: 10 // Auto-renew 10 minutes before expiry
  })

  // Enable automatic session renewal
  useAutoSessionRenewal(autoRenewal && !!user)

  // Ensure this only runs on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Only render session management on client side and when user is authenticated
  if (!isClient || !user) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <SessionStatusIndicator sessionManager={sessionManager} />
    </>
  )
}

/**
 * Session status indicator component
 */
interface SessionStatusIndicatorProps {
  sessionManager: ReturnType<typeof useSessionTimeout>
}

function SessionStatusIndicator({ sessionManager }: SessionStatusIndicatorProps) {
  const [showIndicator, setShowIndicator] = useState(false)
  const { minutesUntilExpiry, isSessionActive } = sessionManager

  useEffect(() => {
    // Show indicator when session is about to expire (less than 10 minutes)
    setShowIndicator(isSessionActive && minutesUntilExpiry <= 10 && minutesUntilExpiry > 0)
  }, [minutesUntilExpiry, isSessionActive])

  if (!showIndicator) return null

  const getIndicatorColor = () => {
    if (minutesUntilExpiry <= 2) return 'bg-red-500'
    if (minutesUntilExpiry <= 5) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  const getIndicatorText = () => {
    const minutes = Math.ceil(minutesUntilExpiry)
    if (minutes <= 1) return 'Session expires in less than 1 minute'
    return `Session expires in ${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        ${getIndicatorColor()} text-white px-4 py-2 rounded-lg shadow-lg
        flex items-center space-x-2 text-sm font-medium
        animate-pulse
      `}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span>{getIndicatorText()}</span>
      </div>
    </div>
  )
}

/**
 * Session timeout modal component
 */
interface SessionTimeoutModalProps {
  isOpen: boolean
  onExtend: () => void
  onLogout: () => void
  minutesLeft: number
}

export function SessionTimeoutModal({
  isOpen,
  onExtend,
  onLogout,
  minutesLeft
}: SessionTimeoutModalProps) {
  const [countdown, setCountdown] = useState(minutesLeft * 60) // Convert to seconds

  useEffect(() => {
    if (!isOpen) return

    setCountdown(minutesLeft * 60)

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, minutesLeft, onLogout])

  if (!isOpen) return null

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Session Expiring Soon
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Your session will expire in{' '}
                  <span className="font-mono font-bold text-red-600">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                  </span>
                  . Would you like to extend your session?
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onExtend}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-maroon-600 text-base font-medium text-white hover:bg-maroon-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Extend Session
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Idle timeout detector component
 */
interface IdleTimeoutDetectorProps {
  onIdle: () => void
  idleTime: number // Minutes
  children: React.ReactNode
}

export function IdleTimeoutDetector({
  onIdle,
  idleTime,
  children
}: IdleTimeoutDetectorProps) {
  const [lastActivity, setLastActivity] = useState(Date.now())

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const resetTimer = () => {
      setLastActivity(Date.now())
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true)
    })

    // Set up idle check
    const checkIdle = () => {
      const now = Date.now()
      const timeSinceLastActivity = (now - lastActivity) / (1000 * 60) // Minutes
      
      if (timeSinceLastActivity >= idleTime) {
        onIdle()
      }
    }

    const interval = setInterval(checkIdle, 30000) // Check every 30 seconds

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true)
      })
      clearInterval(interval)
    }
  }, [lastActivity, idleTime, onIdle])

  return <>{children}</>
}

/**
 * Session activity tracker component
 */
export function SessionActivityTracker({ children }: { children: React.ReactNode }) {
  const sessionManager = useSessionTimeout()

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      sessionManager.updateActivity()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [sessionManager])

  return <>{children}</>
}
