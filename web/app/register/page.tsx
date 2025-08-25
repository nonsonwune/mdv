"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button, Card, Alert } from "../../components/ui"
import { useToast } from "../_components/ToastProvider"

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const sp = useSearchParams()
  const toast = useToast()

  // Validate form fields
  function validateForm(): boolean {
    const newErrors: FormErrors = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = "Password must contain at least one lowercase letter"
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter"
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number"
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Clear previous errors
    setGeneralError(null)
    
    // Validate form
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      // Call the registration endpoint
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        
        // Handle specific error messages
        if (errorText.includes("already registered")) {
          setErrors({ email: "This email is already registered. Please sign in instead." })
        } else {
          setGeneralError(errorText || "Registration failed. Please try again.")
        }
        return
      }

      // Registration successful
      toast.success("Registration successful!", "Welcome to MDV! You are now logged in.")
      
      // Redirect to the intended page or homepage
      const next = sp.get("next") || "/"
      router.replace(next as any)
      
    } catch (e) {
      console.error("Registration error:", e)
      setGeneralError("Unable to connect to the server. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(field: keyof FormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear general error when user makes changes
    if (generalError) {
      setGeneralError(null)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-block mb-4">
              <h1 className="text-2xl font-semibold" style={{ color: "var(--maroon-700)" }}>
                MDV
              </h1>
            </Link>
            <h2 className="text-xl font-semibold" style={{ color: "var(--ink-700)" }}>
              Create Account
            </h2>
            <p className="text-sm mt-2 text-neutral-600">
              Join MDV to enjoy exclusive benefits and faster checkout
            </p>
          </div>

          {/* General Error Alert */}
          {generalError && (
            <Alert variant="error" className="mb-4">
              {generalError}
            </Alert>
          )}

          {/* Registration Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-700 ${
                  errors.name ? "border-danger" : "border-neutral-300"
                }`}
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
                disabled={loading}
              />
              {errors.name && (
                <p className="text-danger text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-700 ${
                  errors.email ? "border-danger" : "border-neutral-300"
                }`}
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                disabled={loading}
              />
              {errors.email && (
                <p className="text-danger text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-700 ${
                    errors.password ? "border-danger" : "border-neutral-300"
                  }`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-danger text-xs mt-1">{errors.password}</p>
              )}
              <p className="text-xs text-neutral-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-700 ${
                  errors.confirmPassword ? "border-danger" : "border-neutral-300"
                }`}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                required
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-danger text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="text-xs text-neutral-600">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-maroon-700 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-maroon-700 hover:underline">
                Privacy Policy
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-500">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <Link
              href={`/login${sp.get("next") ? `?next=${sp.get("next")}` : ""}`}
              className="text-sm text-maroon-700 hover:text-maroon-800 font-medium"
            >
              Sign in instead
            </Link>
          </div>

          {/* Guest Checkout Option */}
          {sp.get("next") === "/checkout" && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => router.push("/checkout?guest=true")}
              >
                Continue as Guest
              </Button>
            </div>
          )}
        </Card>

        {/* Back to Store Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-neutral-600 hover:text-maroon-700">
            ← Back to store
          </Link>
        </div>
      </div>
    </div>
  )
}
