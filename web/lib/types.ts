export type ProductImage = {
  id: number
  url: string
  alt_text?: string | null
  width?: number | null
  height?: number | null
  sort_order: number
  is_primary: boolean
}

export type Variant = {
  id: number
  sku: string
  size?: string | null
  color?: string | null
  price: number
}

export type Product = {
  id: number
  title: string
  slug: string
  description?: string | null
  compare_at_price?: number | null
  variants: Variant[]
  images: ProductImage[]
}

export type CartItem = {
  id: number
  variant_id: number
  qty: number
  // Optional enrichments when backend provides them
  title?: string
  price?: number
  image_url?: string
}

export type Cart = {
  id: number
  items: CartItem[]
}

export type CheckoutInitResponse = {
  authorization_url: string
  order_id?: number
  reference?: string
}

export type OrderTrackingResponse = {
  status: string
}

export type ShippingEstimate = {
  shipping_fee: number
  free_shipping_eligible: boolean
  reason?: string | null
}

export type AuthLoginResponse = {
  token?: string
  access_token?: string
  role?: string
}

