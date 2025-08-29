import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(_req: NextRequest) {
  try {
    const token = cookies().get('mdv_token')?.value
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    // If we have a token, try proxying to the backend security devices endpoint
    if (token) {
      try {
        const res = await fetch(`${backendUrl}/api/security/devices`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          // Next.js runtime fetch: no need for credentials here; cookie is read server-side
        })
        if (res.ok) {
          const data = await res.json()
          // Ensure shape
          return NextResponse.json({ devices: Array.isArray(data.devices) ? data.devices : [] })
        }
      } catch (e) {
        // fall through to mock
      }
    }

    // Fallback: return empty list to avoid console errors
    return NextResponse.json({ devices: [] })
  } catch (error) {
    // Never surface 5xx to avoid noisy console errors on the account page
    return NextResponse.json({ devices: [] })
  }
}

