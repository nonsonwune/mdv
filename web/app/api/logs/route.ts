/**
 * Error Logging API Endpoint
 * 
 * Receives and processes error logs from the frontend application.
 * Provides filtering, rate limiting, and storage capabilities.
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

interface ErrorLogEntry {
  id: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context: {
    userId?: string
    sessionId?: string
    userAgent?: string
    url?: string
    timestamp?: number
    buildVersion?: string
    environment?: string
    feature?: string
    action?: string
    metadata?: Record<string, any>
  }
  fingerprint?: string
  tags?: string[]
  breadcrumbs?: Array<{
    timestamp: number
    category: string
    message: string
    level: string
    data?: Record<string, any>
  }>
  performance?: {
    loadTime?: number
    renderTime?: number
    memoryUsage?: number
    networkLatency?: number
    errorRate?: number
  }
}

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return `rate_limit:${ip}`
}

function checkRateLimit(key: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

function validateLogEntry(entry: any): entry is ErrorLogEntry {
  return (
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    ['error', 'warn', 'info', 'debug'].includes(entry.level) &&
    typeof entry.message === 'string' &&
    typeof entry.context === 'object'
  )
}

function sanitizeLogEntry(entry: ErrorLogEntry): ErrorLogEntry {
  // Remove sensitive information
  const sanitized = { ...entry }

  // Remove sensitive context data
  if (sanitized.context.metadata) {
    const { password, token, secret, ...safeMeta } = sanitized.context.metadata
    sanitized.context.metadata = safeMeta
  }

  // Limit message length
  if (sanitized.message.length > 1000) {
    sanitized.message = sanitized.message.substring(0, 1000) + '...'
  }

  // Limit stack trace length
  if (sanitized.error?.stack && sanitized.error.stack.length > 5000) {
    sanitized.error.stack = sanitized.error.stack.substring(0, 5000) + '...'
  }

  // Limit breadcrumbs
  if (sanitized.breadcrumbs && sanitized.breadcrumbs.length > 50) {
    sanitized.breadcrumbs = sanitized.breadcrumbs.slice(-50)
  }

  return sanitized
}

async function storeLogEntry(entry: ErrorLogEntry): Promise<void> {
  // In production, store in database, send to logging service, etc.
  // For now, we'll just log to console and could store in file system
  
  const logLevel = entry.level.toUpperCase()
  const timestamp = new Date().toISOString()
  
  console.log(`[${timestamp}] [${logLevel}] ${entry.message}`, {
    id: entry.id,
    context: entry.context,
    error: entry.error,
    fingerprint: entry.fingerprint,
    tags: entry.tags
  })

  // In production, you might want to:
  // 1. Store in database for analysis
  // 2. Send to external logging service (Sentry, LogRocket, etc.)
  // 3. Trigger alerts for critical errors
  // 4. Aggregate metrics for monitoring

  // Example: Send critical errors to external service
  if (entry.level === 'error' && entry.context.environment === 'production') {
    await sendToExternalService(entry)
  }
}

async function sendToExternalService(entry: ErrorLogEntry): Promise<void> {
  try {
    // Example: Send to Sentry, LogRocket, or custom logging service
    // await fetch('https://api.external-logging-service.com/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry)
    // })
  } catch (error) {
    console.error('Failed to send log to external service:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request)
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    
    // Handle single log entry or batch
    const entries = Array.isArray(body) ? body : [body]

    // Validate and process each entry
    const processedEntries: ErrorLogEntry[] = []
    
    for (const entry of entries) {
      if (!validateLogEntry(entry)) {
        console.warn('Invalid log entry received:', entry)
        continue
      }

      // Sanitize entry
      const sanitized = sanitizeLogEntry(entry)
      
      // Add server-side context
      sanitized.context = {
        ...sanitized.context,
        serverTimestamp: Date.now(),
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.ip || undefined
      }

      processedEntries.push(sanitized)
    }

    // Store entries
    await Promise.all(processedEntries.map(storeLogEntry))

    return NextResponse.json({
      success: true,
      processed: processedEntries.length,
      total: entries.length
    })

  } catch (error) {
    console.error('Error processing log entries:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Optional: Provide endpoint to retrieve logs for debugging
  // This should be protected with authentication in production
  
  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level')
  const feature = searchParams.get('feature')
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    // In production, query from database
    // For now, return empty array
    const logs: ErrorLogEntry[] = []

    return NextResponse.json({
      logs,
      total: logs.length,
      filters: { level, feature, limit }
    })

  } catch (error) {
    console.error('Error retrieving logs:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
