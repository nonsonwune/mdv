export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(text || `Request failed: ${res.status}`)
    }
    // If no content
    if (res.status === 204) return undefined as unknown as T
    return res.json() as Promise<T>
  } finally {
    clearTimeout(id)
  }
}

