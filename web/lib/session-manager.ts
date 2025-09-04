/**
 * Session management utilities for handling authentication timeouts,
 * automatic logout, and session renewal.
 */

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { useToast } from '../components/ui/toast'

interface SessionConfig {
  warningTime: number // Minutes before expiry to show warning
  checkInterval: number // Seconds between session checks
  renewalThreshold: number // Minutes before expiry to auto-renew
  maxIdleTime: number // Minutes of inactivity before logout
}

const DEFAULT_CONFIG: SessionConfig = {
  warningTime: 5, // 5 minutes warning
  checkInterval: 60, // Check every minute
  renewalThreshold: 10, // Auto-renew 10 minutes before expiry
  maxIdleTime: 30, // 30 minutes idle timeout
}

/**
 * Session timeout manager hook
 */
export function useSessionTimeout(config: Partial<SessionConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const { user, logout, refreshToken } = useAuth()
  const { addToast } = useToast()
  const router = useRouter()
  
  const warningShownRef = useRef(false)
  const lastActivityRef = useRef(Date.now())
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout>()
  const idleCheckIntervalRef = useRef<NodeJS.Timeout>()

  // Update last activity time
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
  }, [])

  // Check if session is about to expire
  const checkSessionExpiry = useCallback(async () => {
    if (!user?.exp) return

    const now = Date.now() / 1000 // Convert to seconds
    const timeUntilExpiry = user.exp - now
    const minutesUntilExpiry = timeUntilExpiry / 60

    // Auto-renew if within renewal threshold
    if (minutesUntilExpiry <= finalConfig.renewalThreshold && minutesUntilExpiry > 0) {
      try {
        await refreshToken()
        console.log('Session automatically renewed')
      } catch (error) {
        console.error('Failed to renew session:', error)
        handleSessionExpired()
        return
      }
    }

    // Show warning if within warning time
    if (minutesUntilExpiry <= finalConfig.warningTime && 
        minutesUntilExpiry > 0 && 
        !warningShownRef.current) {
      
      warningShownRef.current = true
      showSessionWarning(Math.ceil(minutesUntilExpiry))
    }

    // Session has expired
    if (timeUntilExpiry <= 0) {
      handleSessionExpired()
    }
  }, [user, finalConfig, refreshToken])

  // Check for idle timeout
  const checkIdleTimeout = useCallback(() => {
    if (!user) return

    const idleTime = (Date.now() - lastActivityRef.current) / (1000 * 60) // Minutes
    
    if (idleTime >= finalConfig.maxIdleTime) {
      handleIdleTimeout()
    }
  }, [user, finalConfig.maxIdleTime])

  // Handle session expiry
  const handleSessionExpired = useCallback(() => {
    addToast({
      type: 'warning',
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.',
      duration: 8000
    })
    
    logout()
    router.push('/staff-login?error=session_expired')
  }, [addToast, logout, router])

  // Handle idle timeout
  const handleIdleTimeout = useCallback(() => {
    addToast({
      type: 'info',
      title: 'Idle Timeout',
      message: 'You have been signed out due to inactivity.',
      duration: 8000
    })
    
    logout()
    router.push('/staff-login?error=idle_timeout')
  }, [addToast, logout, router])

  // Show session warning
  const showSessionWarning = useCallback((minutesLeft: number) => {
    addToast({
      type: 'warning',
      title: 'Session Expiring Soon',
      message: `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Click to extend.`,
      duration: 0, // Don't auto-dismiss
      action: {
        label: 'Extend Session',
        onClick: async () => {
          try {
            await refreshToken()
            addToast({
              type: 'success',
              title: 'Session Extended',
              message: 'Your session has been extended successfully.'
            })
          } catch (error) {
            addToast({
              type: 'error',
              title: 'Extension Failed',
              message: 'Failed to extend session. Please sign in again.'
            })
            handleSessionExpired()
          }
        }
      }
    })
  }, [addToast, refreshToken, handleSessionExpired])

  // Set up activity listeners
  useEffect(() => {
    if (!user) return

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => updateActivity()
    
    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Set up session check interval
    sessionCheckIntervalRef.current = setInterval(
      checkSessionExpiry, 
      finalConfig.checkInterval * 1000
    )

    // Set up idle check interval
    idleCheckIntervalRef.current = setInterval(
      checkIdleTimeout,
      30 * 1000 // Check every 30 seconds
    )

    // Initial checks
    checkSessionExpiry()
    updateActivity()

    return () => {
      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })

      // Clear intervals
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current)
      }
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current)
      }
    }
  }, [user, checkSessionExpiry, checkIdleTimeout, updateActivity, finalConfig.checkInterval])

  return {
    updateActivity,
    checkSessionExpiry,
    minutesUntilExpiry: user?.exp ? Math.max(0, (user.exp - Date.now() / 1000) / 60) : 0,
    isSessionActive: !!user,
    lastActivity: lastActivityRef.current
  }
}

/**
 * Session renewal utility
 */
export class SessionRenewal {
  private static instance: SessionRenewal
  private renewalPromise: Promise<void> | null = null
  private isRenewing = false

  static getInstance(): SessionRenewal {
    if (!SessionRenewal.instance) {
      SessionRenewal.instance = new SessionRenewal()
    }
    return SessionRenewal.instance
  }

  async renewSession(refreshTokenFn: () => Promise<void>): Promise<void> {
    // Prevent multiple simultaneous renewal attempts
    if (this.isRenewing && this.renewalPromise) {
      return this.renewalPromise
    }

    this.isRenewing = true
    this.renewalPromise = this.performRenewal(refreshTokenFn)

    try {
      await this.renewalPromise
    } finally {
      this.isRenewing = false
      this.renewalPromise = null
    }
  }

  private async performRenewal(refreshTokenFn: () => Promise<void>): Promise<void> {
    try {
      await refreshTokenFn()
      console.log('Session renewed successfully')
    } catch (error) {
      console.error('Session renewal failed:', error)
      throw error
    }
  }

  isCurrentlyRenewing(): boolean {
    return this.isRenewing
  }
}

/**
 * Hook for automatic session renewal
 */
export function useAutoSessionRenewal(enabled = true) {
  const { user, refreshToken } = useAuth()
  const renewalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!enabled || !user?.exp) return

    const scheduleRenewal = () => {
      const now = Date.now() / 1000
      const timeUntilExpiry = user.exp - now
      const renewalTime = Math.max(0, timeUntilExpiry - (10 * 60)) // 10 minutes before expiry

      if (renewalTime > 0) {
        renewalRef.current = setTimeout(async () => {
          try {
            const renewal = SessionRenewal.getInstance()
            await renewal.renewSession(refreshToken)
          } catch (error) {
            console.error('Auto-renewal failed:', error)
          }
        }, renewalTime * 1000)
      }
    }

    scheduleRenewal()

    return () => {
      if (renewalRef.current) {
        clearTimeout(renewalRef.current)
      }
    }
  }, [user, refreshToken, enabled])
}

/**
 * Session storage utilities
 */
export const SessionStorage = {
  setLastActivity(timestamp: number) {
    try {
      localStorage.setItem('lastActivity', timestamp.toString())
    } catch (error) {
      console.warn('Failed to save last activity:', error)
    }
  },

  getLastActivity(): number | null {
    try {
      const stored = localStorage.getItem('lastActivity')
      return stored ? parseInt(stored, 10) : null
    } catch (error) {
      console.warn('Failed to get last activity:', error)
      return null
    }
  },

  clearLastActivity() {
    try {
      localStorage.removeItem('lastActivity')
    } catch (error) {
      console.warn('Failed to clear last activity:', error)
    }
  },

  setSessionWarningShown(shown: boolean) {
    try {
      localStorage.setItem('sessionWarningShown', shown.toString())
    } catch (error) {
      console.warn('Failed to save session warning state:', error)
    }
  },

  getSessionWarningShown(): boolean {
    try {
      const stored = localStorage.getItem('sessionWarningShown')
      return stored === 'true'
    } catch (error) {
      console.warn('Failed to get session warning state:', error)
      return false
    }
  },

  clearSessionWarningShown() {
    try {
      localStorage.removeItem('sessionWarningShown')
    } catch (error) {
      console.warn('Failed to clear session warning state:', error)
    }
  }
}
