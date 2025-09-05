import { NextRequest, NextResponse } from 'next/server'
import { apiCircuitBreaker } from '@/lib/circuit-breaker'

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // Get circuit breaker metrics
    const circuitBreakerMetrics = apiCircuitBreaker.getMetrics()
    
    // Test backend connectivity
    let backendHealth = null
    try {
      const startTime = Date.now()
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      const responseTime = Date.now() - startTime
      
      backendHealth = {
        status: response.ok ? 'healthy' : 'unhealthy',
        response_time_ms: responseTime,
        http_status: response.status
      }
    } catch (error) {
      backendHealth = {
        status: 'unreachable',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Get system metrics
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      uptime_ms: process.uptime() * 1000,
      memory_usage: process.memoryUsage(),
      node_version: process.version,
      platform: process.platform
    }
    
    const monitoringData = {
      service: 'mdv-web',
      status: 'ok',
      timestamp: new Date().toISOString(),
      circuit_breaker: circuitBreakerMetrics,
      backend_connectivity: backendHealth,
      system: systemMetrics,
      environment: {
        node_env: process.env.NODE_ENV,
        api_url_configured: !!(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL),
        backend_url: backendUrl
      }
    }
    
    // Determine overall health status
    const isHealthy = (
      circuitBreakerMetrics.state !== 'OPEN' &&
      backendHealth?.status === 'healthy'
    )
    
    monitoringData.status = isHealthy ? 'healthy' : 'degraded'
    
    return NextResponse.json(monitoringData, {
      status: isHealthy ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      service: 'mdv-web',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Reset circuit breaker (for debugging/ops)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'reset_circuit_breaker') {
      apiCircuitBreaker.reset()
      return NextResponse.json({
        message: 'Circuit breaker reset successfully',
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({
      error: 'Invalid action. Supported actions: reset_circuit_breaker'
    }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
