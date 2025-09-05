export async function GET() {
  const healthStatus = {
    status: "ok",
    service: "mdv-web",
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, any>
  }

  let overallHealthy = true

  // Check backend connectivity
  try {
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const startTime = Date.now()

    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    const responseTime = Date.now() - startTime

    if (response.ok) {
      healthStatus.checks.backend = {
        status: "healthy",
        response_time_ms: responseTime,
        url: backendUrl
      }
    } else {
      healthStatus.checks.backend = {
        status: "unhealthy",
        response_time_ms: responseTime,
        http_status: response.status,
        url: backendUrl
      }
      overallHealthy = false
    }
  } catch (error) {
    healthStatus.checks.backend = {
      status: "unreachable",
      error: error instanceof Error ? error.message : 'Unknown error',
      url: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    }
    overallHealthy = false
  }

  // Check environment variables
  healthStatus.checks.environment = {
    status: "ok",
    api_url_configured: !!(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL),
    node_env: process.env.NODE_ENV || 'unknown'
  }

  // Update overall status
  if (!overallHealthy) {
    healthStatus.status = "degraded"
  }

  return Response.json(healthStatus, {
    status: overallHealthy ? 200 : 503
  })
}

