"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { ArrowRightIcon, TruckIcon, ShieldCheckIcon } from "@heroicons/react/24/outline"
import { api } from "../../lib/api-client"
import RandomFeaturedProduct from "./RandomFeaturedProduct"

interface HomepageConfig {
  hero_title: string
  hero_subtitle: string | null
  hero_cta_text: string
  hero_image_url: string | null
  categories_enabled: boolean
}

export default function HeroSection() {
  const [config, setConfig] = useState<HomepageConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const configData = await api<HomepageConfig>('/api/homepage-config')
      setConfig(configData)
    } catch (error) {
      console.error('Failed to load homepage config:', error)
      // Use default config on error
      setConfig({
        hero_title: "Maison De Valeur",
        hero_subtitle: "Discover affordable essentials and last-season fashion pieces. Quality style that doesn't break the bank, exclusively for Nigeria.",
        hero_cta_text: "Shop Now",
        hero_image_url: null,
        categories_enabled: true
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-maroon-50 min-h-[600px]">
        <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
          <div className="animate-pulse">
            <div className="h-12 bg-neutral-200 rounded w-96 mb-4"></div>
            <div className="h-6 bg-neutral-200 rounded w-128 mb-8"></div>
            <div className="h-12 bg-neutral-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-maroon-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23800000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-maroon-100 text-maroon-800 px-4 py-2 rounded-full text-sm font-medium">
              <SparklesIcon className="w-4 h-4" />
              New Collection Available
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-ink-700 leading-tight">
                {config?.hero_title || "Maison De Valeur"}
              </h1>
              <p className="text-xl text-ink-600 leading-relaxed max-w-lg">
                {config?.hero_subtitle || "Discover affordable essentials and last-season fashion pieces. Quality style that doesn't break the bank, exclusively for Nigeria."}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="#catalog"
                className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2 group"
              >
                {config?.hero_cta_text || "Shop Now"}
                <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link 
                href="/about"
                className="btn-secondary text-lg px-8 py-4"
              >
                Learn More
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-8">
              <div className="flex items-center gap-3 p-3 sm:p-0 bg-white/50 sm:bg-transparent rounded-lg sm:rounded-none">
                <div className="w-10 h-10 sm:w-10 sm:h-10 bg-maroon-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <TruckIcon className="w-5 h-5 text-maroon-700" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-ink-700 text-sm sm:text-base">Free Shipping</div>
                  <div className="text-xs sm:text-sm text-ink-600">On orders over ₦50,000</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-0 bg-white/50 sm:bg-transparent rounded-lg sm:rounded-none">
                <div className="w-10 h-10 sm:w-10 sm:h-10 bg-maroon-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon className="w-5 h-5 text-maroon-700" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-ink-700 text-sm sm:text-base">Authentic</div>
                  <div className="text-xs sm:text-sm text-ink-600">100% genuine products</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-0 bg-white/50 sm:bg-transparent rounded-lg sm:rounded-none">
                <div className="w-10 h-10 sm:w-10 sm:h-10 bg-maroon-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-5 h-5 text-maroon-700 font-bold text-sm">30</div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-ink-700 text-sm sm:text-base">Easy Returns</div>
                  <div className="text-xs sm:text-sm text-ink-600">30-day return policy</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            {/* Main Hero Image Container */}
            <div className="relative">
              {/* Background Decoration */}
              <div className="absolute -inset-4 bg-gradient-to-r from-maroon-200 to-maroon-300 rounded-3xl opacity-20 blur-xl"></div>

              {/* Random Featured Product */}
              <RandomFeaturedProduct />

              {/* Floating Elements */}
              <div className="absolute -top-6 -left-6 w-20 h-20 bg-maroon-700 rounded-full opacity-10 animate-pulse"></div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-maroon-500 rounded-full opacity-5 animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg 
          viewBox="0 0 1440 120" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path 
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="white"
          />
        </svg>
      </div>
    </div>
  )
}
