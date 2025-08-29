import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(_req: NextRequest) {
  try {
    const token = cookies().get('mdv_token')?.value
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    // If we have a token, try proxying to the backend security sessions endpoint
    if (token) {
      try {
        const res = await fetch(`${backendUrl}/api/security/sessions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
        })
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({ sessions: Array.isArray(data.sessions) ? data.sessions : [] })
        }
      } catch (e) {
        // fall through to mock
      }
    }

    // Fallback: return empty list to avoid console errors
    return NextResponse.json({ sessions: [] })
  } catch (error) {
    return NextResponse.json({ sessions: [] })
  }
}

