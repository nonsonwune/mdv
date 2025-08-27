"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Preserve the next parameter if it exists
    const next = searchParams.get("next")
    const redirectUrl = next ? `/customer-login?next=${encodeURIComponent(next)}` : "/customer-login"
    router.replace(redirectUrl)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to customer login...</p>
        <p className="text-sm text-gray-500 mt-2">
          <Link href="/staff-login" className="text-maroon-600 hover:text-maroon-700">
            Staff? Click here instead
          </Link>
        </p>
      </div>
    </div>
  )
}

