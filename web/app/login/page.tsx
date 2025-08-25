"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const sp = useSearchParams()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error(await res.text())
      const next = sp.get("next") || "/admin"
      router.replace(next as any)
    } catch (e) {
      setError("Invalid credentials or server error.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>Staff Sign In</h1>
      <p className="text-sm mt-2" style={{ color: "var(--ink-600)" }}>Customers may checkout as guests; this sign-in is for staff access.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <input className="border p-2 rounded w-full" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="border p-2 rounded w-full" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
      </form>
      <div className="mt-6 space-y-2 text-sm">
        <div>
          <span className="text-neutral-600">Don't have an account? </span>
          <Link href="/register" className="text-maroon-700 hover:text-maroon-800 font-medium">
            Create one here
          </Link>
        </div>
        <div>
          <Link href="/" className="underline">← Back to store</Link>
        </div>
      </div>
    </div>
  )
}

