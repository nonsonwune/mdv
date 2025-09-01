import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Map backend OrderStatus -> UI status
function mapStatus(status: string): 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' {
  const s = (status || '').toLowerCase()
  if (s === 'pendingpayment') return 'pending'
  if (s === 'paid') return 'processing' // paid but not necessarily shipped yet
  if (s === 'cancelled') return 'cancelled'
  if (s === 'refunded') return 'refunded'
  return 'pending'
}

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('mdv_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    // 1) Fetch list of user's orders
    const listRes = await fetch(`${backendUrl}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!listRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: listRes.status }
      )
    }

    const listData = await listRes.json()
    const ordersList: Array<{ id: number; status: string; total?: number; item_count: number; created_at: string }> = listData

    // 2) For each order, fetch details to populate items and address for UI
    const detailed = await Promise.all(
      ordersList.map(async (o) => {
        try {
          const detRes = await fetch(`${backendUrl}/api/orders/${o.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          })

          // If details fail, still return a minimal order row
          if (!detRes.ok) {
            return {
              id: String(o.id),
              orderNumber: `MDV-${o.id}`,
              date: o.created_at,
              status: mapStatus(o.status),
              items: [],
              subtotal: 0,
              shipping: 0,
              tax: 0,
              discount: 0,
              total: o.total ?? 0,
              shippingAddress: { name: '', address: '', city: '', state: '', phone: '' },
              paymentMethod: { type: 'paystack' },
            }
          }

          const det = await detRes.json()
          const items = Array.isArray(det.items) ? det.items : []
          const shippingAddr = det.shipping_address || null
          const totals = det.totals || {}

          return {
            id: String(det.id ?? o.id),
            orderNumber: `MDV-${det.id ?? o.id}`,
            date: det.created_at || o.created_at,
            status: mapStatus(det.status || o.status),
            items: items.map((it: any) => ({
              id: String(it.id),
              productId: String(it.product_id ?? ''),
              title: it.product_name ?? `Variant ${it.variant_id}`,
              variant: [it.size, it.color].filter(Boolean).join(' / '),
              quantity: it.quantity ?? it.qty ?? 1,
              price: Number(it.unit_price ?? 0),
              image: it.image_url || undefined,
            })),
            subtotal: Number(totals.subtotal ?? 0),
            shipping: Number(totals.shipping_fee ?? 0),
            tax: Number(totals.tax ?? 0),
            discount: Number(totals.discount ?? 0),
            total: Number(totals.total ?? o.total ?? 0),
            shippingAddress: {
              name: shippingAddr?.name ?? '',
              address: shippingAddr?.street ?? '',
              city: shippingAddr?.city ?? '',
              state: shippingAddr?.state ?? '',
              phone: shippingAddr?.phone ?? '',
            },
            paymentMethod: { type: 'paystack' },
            trackingNumber: det?.tracking_timeline?.find?.((t: any) => t.code === 'shipped')?.tracking_id,
          }
        } catch {
          return {
            id: String(o.id),
            orderNumber: `MDV-${o.id}`,
            date: o.created_at,
            status: mapStatus(o.status),
            items: [],
            subtotal: 0,
            shipping: 0,
            tax: 0,
            discount: 0,
            total: o.total ?? 0,
            shippingAddress: { name: '', address: '', city: '', state: '', phone: '' },
            paymentMethod: { type: 'paystack' },
          }
        }
      })
    )

    return NextResponse.json({ orders: detailed })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
