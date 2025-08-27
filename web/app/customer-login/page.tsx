"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

export default function CustomerLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

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
      
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText)
      }
      
      const data = await res.json()
      
      // For customers, redirect to account page by default
      const next = searchParams.get("next") || "/account"
      router.replace(next as any)
      
    } catch (e) {
      setError("Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your customer account</p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-maroon-600 hover:bg-maroon-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          <div className="text-center">
            <span className="text-sm text-gray-600">Don't have an account? </span>
            <Link 
              href="/register" 
              className="text-sm font-medium text-maroon-600 hover:text-maroon-500"
            >
              Create one now
            </Link>
          </div>
          
          <div className="text-center">
            <Link 
              href="/checkout" 
              className="text-sm font-medium text-gray-600 hover:text-gray-500"
            >
              Continue as guest for checkout
            </Link>
          </div>

          <div className="border-t pt-4 text-center">
            <Link 
              href="/" 
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to store
            </Link>
          </div>
        </div>

        {/* Staff login link */}
        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-gray-500 mb-2">Staff member?</p>
          <Link 
            href="/staff-login" 
            className="text-xs text-maroon-600 hover:text-maroon-500"
          >
            Staff Sign In →
          </Link>
        </div>
      </div>
    </div>
  )
}
