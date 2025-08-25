"use client"

import { useState, useEffect } from 'react'
import { Card, Button, Badge, Modal, ProgressBar } from '../ui'
import type { Product, ProductVariant } from '../../lib/types'

interface SizeRecommendationProps {
  product: Product
  onSizeSelect?: (size: string) => void
}

interface BrandFit {
  brand: string
  yourSize: string
  fitNotes: string
}

interface FitProfile {
  bodyType: 'athletic' | 'slim' | 'regular' | 'curvy' | 'plus'
  preferredFit: 'tight' | 'fitted' | 'regular' | 'loose' | 'oversized'
  height: string
  weight: string
}

export default function SizeRecommendation({ product, onSizeSelect }: SizeRecommendationProps) {
  const [recommendedSize, setRecommendedSize] = useState<string>('')
  const [confidence, setConfidence] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [fitProfile, setFitProfile] = useState<FitProfile | null>(null)
  const [brandComparison, setBrandComparison] = useState<BrandFit[]>([])
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  useEffect(() => {
    loadFitProfile()
    calculateRecommendation()
  }, [product])

  const loadFitProfile = () => {
    const saved = localStorage.getItem('mdv_fit_profile')
    if (saved) {
      setFitProfile(JSON.parse(saved))
    }
  }

  const calculateRecommendation = () => {
    setIsCalculating(true)
    
    // Simulate AI calculation
    setTimeout(() => {
      // Mock recommendation logic
      const sizes = product.variants?.map(v => v.size).filter(Boolean) || []
      if (sizes.length > 0) {
        // Simple mock logic - would be replaced with actual AI/ML model
        const sizeIndex = Math.min(2, sizes.length - 1)
        setRecommendedSize(sizes[sizeIndex] || 'M')
        setConfidence(85 + Math.random() * 10)
      }
      
      // Mock brand comparison
      setBrandComparison([
        { brand: 'Nike', yourSize: 'M', fitNotes: 'Runs small, size up' },
        { brand: 'Adidas', yourSize: 'L', fitNotes: 'True to size' },
        { brand: 'Zara', yourSize: 'M', fitNotes: 'European sizing, runs small' },
        { brand: 'H&M', yourSize: 'L', fitNotes: 'Slim fit, consider sizing up' }
      ])
      
      setIsCalculating(false)
    }, 1000)
  }

  const saveFitProfile = (profile: FitProfile) => {
    setFitProfile(profile)
    localStorage.setItem('mdv_fit_profile', JSON.stringify(profile))
    setShowProfileModal(false)
    calculateRecommendation()
  }

  const getFitScore = (size: string): number => {
    // Mock fit score calculation
    if (size === recommendedSize) return 95
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    const recommendedIndex = sizes.indexOf(recommendedSize)
    const sizeIndex = sizes.indexOf(size)
    const difference = Math.abs(recommendedIndex - sizeIndex)
    return Math.max(50, 95 - (difference * 20))
  }

  const getFitDescription = (score: number): string => {
    if (score >= 90) return 'Perfect Fit'
    if (score >= 75) return 'Good Fit'
    if (score >= 60) return 'Acceptable'
    return 'Poor Fit'
  }

  const getFitColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-4">
      {/* Main Recommendation Card */}
      <Card className="p-4 border-2 border-maroon-700">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">AI Size Recommendation</h3>
            {isCalculating ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-maroon-700"></div>
                <span className="text-sm text-neutral-600">Analyzing fit...</span>
              </div>
            ) : (
              recommendedSize && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl font-bold text-maroon-700">
                    Size {recommendedSize}
                  </span>
                  <Badge variant="success">
                    {confidence.toFixed(0)}% Match
                  </Badge>
                </div>
              )
            )}
          </div>
          {!fitProfile && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowProfileModal(true)}
            >
              Create Fit Profile
            </Button>
          )}
        </div>

        {recommendedSize && !isCalculating && (
          <>
            <p className="text-sm text-neutral-600 mb-3">
              Based on your measurements and {product.vendor || 'this brand'}'s sizing, 
              we recommend size {recommendedSize} for the best fit.
            </p>

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => onSizeSelect?.(recommendedSize)}
            >
              Select Size {recommendedSize}
            </Button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-maroon-700 hover:underline mt-3 w-full text-center"
            >
              {showDetails ? 'Hide' : 'Show'} detailed analysis →
            </button>
          </>
        )}
      </Card>

      {/* Detailed Analysis */}
      {showDetails && recommendedSize && (
        <>
          {/* Size Comparison */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3">Size Analysis</h4>
            <div className="space-y-3">
              {product.variants?.filter(v => v.size).map(variant => {
                const score = getFitScore(variant.size!)
                return (
                  <div key={variant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onSizeSelect?.(variant.size!)}
                        className={`
                          px-3 py-1 rounded border transition-colors
                          ${variant.size === recommendedSize
                            ? 'bg-maroon-700 text-white border-maroon-700'
                            : 'bg-white hover:border-maroon-500'
                          }
                        `}
                      >
                        {variant.size}
                      </button>
                      <span className={`text-sm font-medium ${getFitColor(score)}`}>
                        {getFitDescription(score)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar 
                        value={score} 
                        className="w-24"
                        color={score >= 90 ? 'green' : score >= 60 ? 'yellow' : 'red'}
                      />
                      <span className="text-sm text-neutral-600 w-10 text-right">
                        {score}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Brand Comparison */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3">How This Brand Fits</h4>
            <p className="text-sm text-neutral-600 mb-3">
              Based on community data and your purchase history
            </p>
            <div className="space-y-2">
              {brandComparison.map((brand, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-neutral-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{brand.brand}</span>
                    <Badge variant="secondary" size="sm">
                      Size {brand.yourSize}
                    </Badge>
                  </div>
                  <span className="text-xs text-neutral-600">{brand.fitNotes}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Fit Details */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3">Fit Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-2">This size typically fits:</p>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Chest: 95-100cm
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Waist: 75-80cm
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    Length: 68cm
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-2">Customer feedback:</p>
                <ul className="space-y-1 text-sm">
                  <li>• 78% say true to size</li>
                  <li>• 15% say runs small</li>
                  <li>• 7% say runs large</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm mb-1">Pro Tip</p>
                <p className="text-sm text-neutral-700">
                  If you're between sizes, we recommend sizing up for a more comfortable fit, 
                  especially if you prefer a relaxed style.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Fit Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Create Your Fit Profile"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            saveFitProfile({
              bodyType: formData.get('bodyType') as any,
              preferredFit: formData.get('preferredFit') as any,
              height: formData.get('height') as string,
              weight: formData.get('weight') as string
            })
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-2">Body Type</label>
            <select name="bodyType" className="w-full px-3 py-2 border border-neutral-300 rounded-lg" required>
              <option value="">Select your body type</option>
              <option value="athletic">Athletic</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="curvy">Curvy</option>
              <option value="plus">Plus Size</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preferred Fit</label>
            <select name="preferredFit" className="w-full px-3 py-2 border border-neutral-300 rounded-lg" required>
              <option value="">Select your preferred fit</option>
              <option value="tight">Tight/Skin-fit</option>
              <option value="fitted">Fitted</option>
              <option value="regular">Regular</option>
              <option value="loose">Loose</option>
              <option value="oversized">Oversized</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Height (cm)</label>
              <input
                type="number"
                name="height"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                placeholder="e.g., 175"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                placeholder="e.g., 70"
                required
              />
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-sm text-neutral-600">
              <strong>Privacy:</strong> Your fit profile is stored locally and used only to provide 
              personalized size recommendations. We never share this data.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowProfileModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
            >
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
