import { API_BASE } from "./api"

const KEY = "mdv_cart_id"
const CART_VERSION_KEY = "mdv_cart_version"
const CART_BACKUP_KEY = "mdv_cart_backup"
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// Cart versioning to handle stale data
function getCartVersion(): number {
  if (typeof window === "undefined") return 0
  return Number(localStorage.getItem(CART_VERSION_KEY) || "0")
}

function incrementCartVersion() {
  if (typeof window === "undefined") return
  const version = getCartVersion()
  localStorage.setItem(CART_VERSION_KEY, String(version + 1))
}

export function getStoredCartId(): number | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function setStoredCartId(id: number) {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, String(id))
  incrementCartVersion()
}

export function clearStoredCartId() {
  if (typeof window === "undefined") return
  localStorage.removeItem(KEY)
  localStorage.removeItem(CART_VERSION_KEY)
  localStorage.removeItem(CART_BACKUP_KEY)
}

// Backup cart data for recovery
function backupCartData(data: CartData) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CART_BACKUP_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (e) {
    console.warn("Failed to backup cart data:", e)
  }
}

function getBackupCartData(): CartData | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CART_BACKUP_KEY)
    if (!raw) return null
    const backup = JSON.parse(raw)
    // Only use backup if it's less than 24 hours old
    if (Date.now() - backup.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CART_BACKUP_KEY)
      return null
    }
    return backup.data
  } catch (e) {
    return null
  }
}

export async function apiCreateCart(retries = 0): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/api/cart`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}) 
    })
    
    if (!res.ok) {
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return apiCreateCart(retries + 1)
      }
      throw new Error(`Failed to create cart: ${res.status}`)
    }
    
    const data = await res.json()
    const id = Number(data.id)
    if (!Number.isFinite(id) || id <= 0) {
      throw new Error("Invalid cart ID received")
    }
    return id
  } catch (e: any) {
    if (retries < MAX_RETRIES && !e.message?.includes("Invalid cart ID")) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return apiCreateCart(retries + 1)
    }
    throw e
  }
}

export async function ensureCartId(): Promise<number> {
  let id = getStoredCartId()
  
  if (!id) {
    try {
      id = await apiCreateCart()
      setStoredCartId(id)
    } catch (e) {
      console.error("Failed to create cart:", e)
      // Return a temporary ID for offline mode
      id = -1
    }
  }
  
  return id
}

export type CartData = { 
  id: number
  items: { 
    id: number
    variant_id: number
    qty: number
    price?: number
    image_url?: string
    title?: string 
  }[] 
}

export async function fetchCart(id: number, retries = 0): Promise<CartData> {
  // Handle offline mode
  if (id === -1) {
    const backup = getBackupCartData()
    if (backup) return backup
    return { id: -1, items: [] }
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/cart/${id}`, { 
      cache: "no-store",
      headers: { "Accept": "application/json" }
    })
    
    if (res.status === 404) {
      // Cart not found, clear and throw to trigger recreation
      clearStoredCartId()
      throw Object.assign(new Error("CartNotFound"), { code: 404 })
    }
    
    if (!res.ok) {
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return fetchCart(id, retries + 1)
      }
      throw new Error(`Failed to fetch cart: ${res.status}`)
    }
    
    const data = await res.json()
    backupCartData(data) // Backup successful fetch
    return data
  } catch (e: any) {
    if (e.code === 404) throw e // Don't retry 404s
    
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return fetchCart(id, retries + 1)
    }
    
    // If all retries failed, try to use backup
    const backup = getBackupCartData()
    if (backup && backup.id === id) {
      console.warn("Using backup cart data due to fetch failure")
      return backup
    }
    
    throw e
  }
}

export async function fetchCartOrCreate(): Promise<CartData> {
  try {
    const id = await ensureCartId()
    return await fetchCart(id)
  } catch (e: any) {
    if (e && e.code === 404) {
      // Cart not found, create a new one
      clearStoredCartId()
      try {
        const newId = await apiCreateCart()
        setStoredCartId(newId)
        return await fetchCart(newId)
      } catch (createError) {
        console.error("Failed to create new cart:", createError)
        // Return empty cart for offline mode
        return { id: -1, items: [] }
      }
    }
    throw e
  }
}

export async function addItemWithRecovery(variantId: number, qty: number): Promise<CartData> {
  let attempts = 0
  const maxAttempts = 2
  
  while (attempts < maxAttempts) {
    try {
      const id = await ensureCartId()
      
      // Handle offline mode
      if (id === -1) {
        const backup = getBackupCartData() || { id: -1, items: [] }
        const existingItem = backup.items.find(item => item.variant_id === variantId)
        
        if (existingItem) {
          existingItem.qty += qty
        } else {
          backup.items.push({
            id: Date.now(), // Temporary ID
            variant_id: variantId,
            qty
          })
        }
        
        backupCartData(backup)
        return backup
      }
      
      const res = await fetch(`${API_BASE}/api/cart/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId, qty })
      })
      
      if (res.status === 404) {
        // Cart missing, recreate and retry
        clearStoredCartId()
        attempts++
        continue
      }
      
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `Failed to add item: ${res.status}`)
      }
      
      const updatedCart = await fetchCart(id)
      return updatedCart
      
    } catch (e: any) {
      if (attempts >= maxAttempts - 1) {
        console.error("Failed to add item after retries:", e)
        
        // Try offline mode as last resort
        const backup = getBackupCartData() || { id: -1, items: [] }
        backup.items.push({
          id: Date.now(),
          variant_id: variantId,
          qty
        })
        backupCartData(backup)
        return backup
      }
      attempts++
    }
  }
  
  throw new Error("Failed to add item to cart")
}

// New utility functions for cart management
export async function updateCartItem(cartId: number, itemId: number, qty: number): Promise<CartData> {
  if (qty <= 0) {
    return removeCartItem(cartId, itemId)
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/cart/${cartId}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty })
    })
    
    if (res.status === 404) {
      clearStoredCartId()
      throw Object.assign(new Error("CartNotFound"), { code: 404 })
    }
    
    if (!res.ok) throw new Error(await res.text())
    return fetchCart(cartId)
  } catch (e: any) {
    // Handle offline mode
    if (cartId === -1) {
      const backup = getBackupCartData()
      if (backup) {
        const item = backup.items.find(i => i.id === itemId)
        if (item) item.qty = qty
        backupCartData(backup)
        return backup
      }
    }
    throw e
  }
}

export async function removeCartItem(cartId: number, itemId: number): Promise<CartData> {
  try {
    const res = await fetch(`${API_BASE}/api/cart/${cartId}/items/${itemId}`, {
      method: "DELETE"
    })
    
    if (res.status === 404) {
      clearStoredCartId()
      throw Object.assign(new Error("CartNotFound"), { code: 404 })
    }
    
    if (!res.ok) throw new Error(await res.text())
    return fetchCart(cartId)
  } catch (e: any) {
    // Handle offline mode
    if (cartId === -1) {
      const backup = getBackupCartData()
      if (backup) {
        backup.items = backup.items.filter(i => i.id !== itemId)
        backupCartData(backup)
        return backup
      }
    }
    throw e
  }
}

export async function clearCart(cartId: number): Promise<CartData> {
  try {
    const res = await fetch(`${API_BASE}/api/cart/${cartId}/clear`, {
      method: "POST"
    })
    
    if (res.status === 404) {
      clearStoredCartId()
      throw Object.assign(new Error("CartNotFound"), { code: 404 })
    }
    
    if (!res.ok) throw new Error(await res.text())
    return fetchCart(cartId)
  } catch (e: any) {
    // Handle offline mode
    if (cartId === -1) {
      const emptyCart = { id: -1, items: [] }
      backupCartData(emptyCart)
      return emptyCart
    }
    throw e
  }
}

