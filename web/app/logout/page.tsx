"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LogoutPage() {
  const router = useRouter()
  useEffect(() => {
    (async () => {
      try {
        await fetch(`/api/auth/logout`, { method: "POST", cache: "no-store" })
      } catch {
        // ignore
      } finally {
        router.replace("/")
      }
    })()
  }, [router])
  return null
}

