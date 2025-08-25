"use client"

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Card, Button, Badge, Modal } from '../ui'
import { formatNaira } from '../../lib/format'
import type { Product } from '../../lib/types'

interface VirtualTryOnProps {
  product: Product
  onClose?: () => void
}

interface SizeRecommendation {
  size: string
  fit: 'perfect' | 'tight' | 'loose'
  confidence: number
  message: string
}

interface UserMeasurements {
  height?: number
  weight?: number
  chest?: number
  waist?: number
  hips?: number
  shoeSize?: number
}

export default function VirtualTryOn({ product, onClose }: VirtualTryOnProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [measurements, setMeasurements] = useState<UserMeasurements>({})
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'measure' | 'compare'>('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [savedLooks, setSavedLooks] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Load saved measurements from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mdv_measurements')
    if (saved) {
      setMeasurements(JSON.parse(saved))
    }
  }, [])

  // Auto-hide toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setToastMessage('Image size must be less than 5MB')
        setShowToast(true)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
        setIsProcessing(true)
        
        // Simulate processing
        setTimeout(() => {
          setIsProcessing(false)
          setToastMessage('Image uploaded successfully!')
          setShowToast(true)
        }, 2000)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveMeasurements = () => {
    localStorage.setItem('mdv_measurements', JSON.stringify(measurements))
    calculateSizeRecommendation()
    setToastMessage('Measurements saved successfully!')
    setShowToast(true)
  }

  const calculateSizeRecommendation = () => {
    // Mock size recommendation algorithm
    const { chest, waist, hips } = measurements
    
    if (!chest && !waist && !hips) {
      setRecommendation(null)
      return
    }

    // Simple logic for demonstration
    let recommendedSize = 'M'
    let fit: 'perfect' | 'tight' | 'loose' = 'perfect'
    let confidence = 85

    if (chest) {
      if (chest < 90) recommendedSize = 'S'
      else if (chest < 100) recommendedSize = 'M'
      else if (chest < 110) recommendedSize = 'L'
      else recommendedSize = 'XL'
    }

    if (waist && waist > 85) {
      if (recommendedSize === 'S') fit = 'tight'
      confidence -= 10
    }

    setRecommendation({
      size: recommendedSize,
      fit,
      confidence,
      message: fit === 'perfect' 
        ? `Size ${recommendedSize} should fit you perfectly!`
        : fit === 'tight'
        ? `Size ${recommendedSize} might be a bit snug. Consider size ${getSizeUp(recommendedSize)}`
        : `Size ${recommendedSize} will have a relaxed fit.`
    })
  }

  const getSizeUp = (size: string) => {
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    const index = sizes.indexOf(size)
    return index < sizes.length - 1 ? sizes[index + 1] : size
  }

  const saveLook = () => {
    if (uploadedImage) {
      const lookData = JSON.stringify({
        image: uploadedImage,
        product: product.id,
        date: new Date().toISOString()
      })
      const looks = [...savedLooks, lookData]
      setSavedLooks(looks)
      localStorage.setItem('mdv_saved_looks', JSON.stringify(looks))
      setToastMessage('Look saved to your collection!')
      setShowToast(true)
    }
  }

  const sizeChart = {
    tops: {
      'XS': { chest: '80-85', waist: '60-65', length: '60' },
      'S': { chest: '85-90', waist: '65-70', length: '62' },
      'M': { chest: '90-95', waist: '70-75', length: '64' },
      'L': { chest: '95-100', waist: '75-80', length: '66' },
      'XL': { chest: '100-105', waist: '80-85', length: '68' },
      'XXL': { chest: '105-110', waist: '85-90', length: '70' }
    },
    bottoms: {
      'XS': { waist: '60-65', hips: '85-90', length: '96' },
      'S': { waist: '65-70', hips: '90-95', length: '98' },
      'M': { waist: '70-75', hips: '95-100', length: '100' },
      'L': { waist: '75-80', hips: '100-105', length: '102' },
      'XL': { waist: '80-85', hips: '105-110', length: '104' },
      'XXL': { waist: '85-90', hips: '110-115', length: '106' }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Virtual Try-On</h2>
            <p className="text-sm text-neutral-600 mt-1">{product.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-80px)]">
          {/* Left Panel - Product & Try-On View */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Product View */}
              <div>
                <h3 className="font-semibold mb-3">Product View</h3>
                <div className="relative aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden mb-4">
                  {product.images?.[selectedImage] && (
                    <Image
                      src={product.images[selectedImage].url}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                
                {/* Product Images Thumbnails */}
                {product.images && product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`
                          relative w-16 h-20 rounded overflow-hidden flex-shrink-0
                          ${selectedImage === idx ? 'ring-2 ring-maroon-700' : 'ring-1 ring-neutral-300'}
                        `}
                      >
                        <Image
                          src={img.url}
                          alt={`View ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Try-On View */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Your Try-On</h3>
                  {uploadedImage && (
                    <Button variant="secondary" size="sm" onClick={saveLook}>
                      Save Look
                    </Button>
                  )}
                </div>
                
                <div className="relative aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden mb-4">
                  {isProcessing ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700 mx-auto mb-3"></div>
                        <p className="text-sm text-neutral-600">Processing image...</p>
                      </div>
                    </div>
                  ) : uploadedImage ? (
                    <>
                      <Image
                        src={uploadedImage}
                        alt="Your photo"
                        fill
                        className="object-cover"
                      />
                      {/* Overlay product image (simplified virtual try-on) */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-3/4 h-1/2 opacity-90">
                          {product.images?.[0] && (
                            <Image
                              src={product.images[0].url}
                              alt={product.title}
                              fill
                              className="object-contain"
                            />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-neutral-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-neutral-600 mb-3">Upload your photo to try on</p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload Photo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {uploadedImage && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setUploadedImage(null)}
                    >
                      Remove Photo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Size & Fit */}
          <div className="w-full lg:w-96 border-l bg-neutral-50 p-6 overflow-y-auto">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'upload', label: 'Upload', icon: '📸' },
                { id: 'measure', label: 'Measurements', icon: '📏' },
                { id: 'compare', label: 'Compare', icon: '🔄' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-maroon-700 text-white' 
                      : 'bg-white text-neutral-700 hover:bg-neutral-100'
                    }
                  `}
                >
                  <span>{tab.icon}</span>
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Upload Instructions */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">How to get the best results</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Stand straight</p>
                        <p className="text-xs text-neutral-600">Face the camera directly</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Good lighting</p>
                        <p className="text-xs text-neutral-600">Natural light works best</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Fitted clothing</p>
                        <p className="text-xs text-neutral-600">Wear something close-fitting</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Privacy Notice</h4>
                  <p className="text-sm text-neutral-600">
                    Your photos are processed locally in your browser and are never uploaded to our servers. 
                    We respect your privacy and data security.
                  </p>
                </Card>
              </div>
            )}

            {/* Measurements Tab */}
            {activeTab === 'measure' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Your Measurements</h4>
                  <p className="text-sm text-neutral-600 mb-4">
                    Enter your measurements for personalized size recommendations
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Height (cm)</label>
                      <input
                        type="number"
                        value={measurements.height || ''}
                        onChange={(e) => setMeasurements({ ...measurements, height: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                        placeholder="e.g., 170"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        value={measurements.weight || ''}
                        onChange={(e) => setMeasurements({ ...measurements, weight: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                        placeholder="e.g., 65"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Chest (cm)</label>
                      <input
                        type="number"
                        value={measurements.chest || ''}
                        onChange={(e) => setMeasurements({ ...measurements, chest: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                        placeholder="e.g., 95"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Waist (cm)</label>
                      <input
                        type="number"
                        value={measurements.waist || ''}
                        onChange={(e) => setMeasurements({ ...measurements, waist: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                        placeholder="e.g., 75"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Hips (cm)</label>
                      <input
                        type="number"
                        value={measurements.hips || ''}
                        onChange={(e) => setMeasurements({ ...measurements, hips: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                        placeholder="e.g., 100"
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-4"
                    onClick={saveMeasurements}
                  >
                    Save & Get Recommendation
                  </Button>
                </Card>

                {/* Size Recommendation */}
                {recommendation && (
                  <Card className="p-4 border-2 border-maroon-700">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold">Recommended Size</h4>
                      <Badge variant="primary" size="sm">
                        {recommendation.confidence}% confidence
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-3xl font-bold text-maroon-700">
                        Size {recommendation.size}
                      </div>
                      <Badge 
                        variant={
                          recommendation.fit === 'perfect' ? 'success' : 
                          recommendation.fit === 'tight' ? 'warning' : 'secondary'
                        }
                      >
                        {recommendation.fit} fit
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-neutral-600">
                      {recommendation.message}
                    </p>
                  </Card>
                )}

                {/* Size Guide */}
                <Card className="p-4">
                  <button
                    onClick={() => setShowSizeGuide(!showSizeGuide)}
                    className="flex items-center justify-between w-full mb-3"
                  >
                    <h4 className="font-semibold">Size Guide</h4>
                    <svg 
                      className={`w-5 h-5 transition-transform ${showSizeGuide ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showSizeGuide && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Size</th>
                            <th className="text-left py-2">Chest</th>
                            <th className="text-left py-2">Waist</th>
                            <th className="text-left py-2">Length</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(sizeChart.tops).map(([size, measurements]) => (
                            <tr key={size} className="border-b">
                              <td className="py-2 font-medium">{size}</td>
                              <td className="py-2">{measurements.chest}</td>
                              <td className="py-2">{measurements.waist}</td>
                              <td className="py-2">{measurements.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Compare Tab */}
            {activeTab === 'compare' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Compare with Similar Items</h4>
                  <p className="text-sm text-neutral-600 mb-4">
                    See how this item compares with others you've tried
                  </p>
                  
                  <div className="space-y-3">
                    {/* Mock comparison items */}
                    {[
                      { name: 'Cotton Basic Tee', brand: 'Brand A', size: 'M', fit: 'Perfect' },
                      { name: 'Slim Fit Shirt', brand: 'Brand B', size: 'L', fit: 'Tight' },
                      { name: 'Oversized Hoodie', brand: 'Brand C', size: 'M', fit: 'Loose' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-neutral-600">{item.brand} • Size {item.size}</p>
                        </div>
                        <Badge 
                          variant={
                            item.fit === 'Perfect' ? 'success' : 
                            item.fit === 'Tight' ? 'warning' : 'secondary'
                          }
                          size="sm"
                        >
                          {item.fit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Fit Predictor</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shoulders</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-8 h-2 rounded ${i < 3 ? 'bg-green-500' : 'bg-neutral-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Chest</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-8 h-2 rounded ${i < 4 ? 'bg-green-500' : 'bg-neutral-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Waist</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-8 h-2 rounded ${i < 3 ? 'bg-green-500' : 'bg-neutral-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Length</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-8 h-2 rounded ${i < 4 ? 'bg-yellow-500' : 'bg-neutral-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {showToast && (
          <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 animate-pulse">
            <p className="text-sm">{toastMessage}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
