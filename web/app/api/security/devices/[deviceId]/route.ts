import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function DELETE(req: NextRequest, { params }: { params: { deviceId: string } }) {
  const { deviceId } = params
  try {
    const token = cookies().get('mdv_token')?.value
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
    }

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const res = await fetch(`${backendUrl}/api/security/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: text || 'Failed to remove device' }, { status: res.status })
    }

    return NextResponse.json({ message: 'Device removed' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

