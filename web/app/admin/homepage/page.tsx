"use client"

import { useState, useEffect } from "react"
import { api } from "../../../lib/api-client"
import { RoleGuard } from "../../../components/auth/RoleGuard"
import { PermissionGuard } from "../../../components/auth/PermissionGuard"
import { Permission } from "../../../lib/auth-context"
import {
  HomeIcon,
  PhotoIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline"

interface HomepageConfig {
  id: number
  hero_title: string
  hero_subtitle: string | null
  hero_cta_text: string
  hero_image_url: string | null
  categories_enabled: boolean
  created_at: string
  updated_at: string | null
}

export default function HomepageManagement() {
  const [config, setConfig] = useState<HomepageConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Form state
  const [heroTitle, setHeroTitle] = useState("")
  const [heroSubtitle, setHeroSubtitle] = useState("")
  const [heroCtaText, setHeroCtaText] = useState("")
  const [heroImageUrl, setHeroImageUrl] = useState("")
  const [categoriesEnabled, setCategoriesEnabled] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const configRes = await api<HomepageConfig>('/api/admin/homepage/config')

      setConfig(configRes)

      // Set form values
      setHeroTitle(configRes.hero_title)
      setHeroSubtitle(configRes.hero_subtitle || "")
      setHeroCtaText(configRes.hero_cta_text)
      setHeroImageUrl(configRes.hero_image_url || "")
      setCategoriesEnabled(configRes.categories_enabled)
    } catch (error) {
      console.error('Failed to load homepage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updatedConfig = await api<HomepageConfig>('/api/admin/homepage/config', {
        method: 'PUT',
        body: JSON.stringify({
          hero_title: heroTitle,
          hero_subtitle: heroSubtitle || null,
          hero_cta_text: heroCtaText,
          hero_image_url: heroImageUrl || null,
          categories_enabled: categoriesEnabled
        })
      })

      setConfig(updatedConfig)
      alert('Homepage configuration saved successfully!')
      
      // Reload candidates to update featured status
      await loadData()
    } catch (error) {
      console.error('Failed to save homepage config:', error)
      alert('Failed to save configuration. Please try again.')
    } finally {
      setSaving(false)
    }
  }



  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard roles={['admin']}>
      <PermissionGuard permission={Permission.SYSTEM_SETTINGS}>
        <div className="p-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <HomeIcon className="h-6 w-6" />
                  Homepage Configuration
                </h1>
                <p className="text-gray-600 mt-1">
                  Configure hero section, featured products, and homepage layout
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <EyeIcon className="h-5 w-5" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-maroon-700 text-white rounded-lg hover:bg-maroon-800 transition-colors disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Configuration Form */}
            <div className="space-y-6">
              {/* Hero Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PhotoIcon className="h-5 w-5" />
                  Hero Section
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      placeholder="Maison De Valeur"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subtitle
                    </label>
                    <textarea
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      placeholder="Discover affordable essentials..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={heroCtaText}
                      onChange={(e) => setHeroCtaText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      placeholder="Shop Now"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
                      placeholder="https://example.com/hero-image.jpg"
                    />
                  </div>
                </div>
              </div>

              {/* Layout Options */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Layout Options
                </h2>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={categoriesEnabled}
                      onChange={(e) => setCategoriesEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Show Categories Showcase
                    </span>
                  </label>
                </div>
              </div>
            </div>


          </div>
        </div>
      </PermissionGuard>
    </RoleGuard>
  )
}
