"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, Button, Badge, Modal, EmptyState, Input, Alert } from '../ui'
import { formatNaira } from '../../lib/format'
import type { Product } from '../../lib/types'

interface Review {
  id: string
  productId: number
  productName: string
  productImage: string
  rating: number
  title: string
  comment: string
  pros?: string[]
  cons?: string[]
  images?: string[]
  verified: boolean
  helpful: number
  notHelpful: number
  date: string
  status: 'published' | 'pending' | 'rejected'
  response?: {
    message: string
    date: string
  }
  userVote?: 'helpful' | 'not-helpful' | null
}

interface ReviewStats {
  totalReviews: number
  averageRating: number
  publishedReviews: number
  pendingReviews: number
  rejectedReviews: number
  pointsEarned: number
  helpfulVotes: number
}

interface PurchasedProduct {
  id: number
  name: string
  image: string
  purchaseDate: string
  orderId: string
  reviewed: boolean
}

export default function ReviewsRatings() {
  const [activeTab, setActiveTab] = useState<'my-reviews' | 'write-review' | 'stats'>('my-reviews')
  const [reviews, setReviews] = useState<Review[]>([])
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([])
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    publishedReviews: 0,
    pendingReviews: 0,
    rejectedReviews: 0,
    pointsEarned: 0,
    helpfulVotes: 0
  })
  const [selectedProduct, setSelectedProduct] = useState<PurchasedProduct | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'pending' | 'rejected'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'rating-high' | 'rating-low' | 'helpful'>('recent')
  const [loading, setLoading] = useState(true)

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
    pros: '',
    cons: '',
    recommendProduct: true
  })

  useEffect(() => {
    loadReviewsData()
  }, [])

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const loadReviewsFromAPI = async (): Promise<Review[]> => {
    try {
      const response = await fetch('/api/reviews', {
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.reviews || []
      }
    } catch (error) {
      console.error('Error loading reviews from API:', error)
    }
    return []
  }

  const loadPurchasedProductsFromAPI = async (): Promise<PurchasedProduct[]> => {
    try {
      const response = await fetch('/api/orders/reviewable-products', {
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.products || []
      }
    } catch (error) {
      console.error('Error loading purchased products from API:', error)
    }
    return []
  }

  const loadReviewsData = async () => {
    try {
      // Load reviews from API
      const reviewsData = await loadReviewsFromAPI()
      const purchasedData = await loadPurchasedProductsFromAPI()
      
      setReviews(reviewsData)
      setPurchasedProducts(purchasedData)

      // Calculate stats from real data
      const published = reviewsData.filter(r => r.status === 'published').length
      const pending = reviewsData.filter(r => r.status === 'pending').length
      const rejected = reviewsData.filter(r => r.status === 'rejected').length
      const avgRating = reviewsData.length > 0 
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length 
        : 0
      const totalHelpful = reviewsData.reduce((sum, r) => sum + r.helpful, 0)

      setStats({
        totalReviews: reviewsData.length,
        averageRating: avgRating,
        publishedReviews: published,
        pendingReviews: pending,
        rejectedReviews: rejected,
        pointsEarned: published * 50, // 50 points per published review
        helpfulVotes: totalHelpful
      })
    } catch (error) {
      console.error('Error loading reviews data:', error)
      // Set empty state on error
      setReviews([])
      setPurchasedProducts([])
      setStats({
        totalReviews: 0,
        averageRating: 0,
        publishedReviews: 0,
        pendingReviews: 0,
        rejectedReviews: 0,
        pointsEarned: 0,
        helpfulVotes: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWriteReview = (product: PurchasedProduct) => {
    setSelectedProduct(product)
    setShowReviewModal(true)
    setReviewForm({
      rating: 5,
      title: '',
      comment: '',
      pros: '',
      cons: '',
      recommendProduct: true
    })
  }

  const submitReview = () => {
    if (!selectedProduct) return

    if (!reviewForm.title || !reviewForm.comment) {
      setToastMessage('Please fill in all required fields')
      setShowToast(true)
      return
    }

    const newReview: Review = {
      id: Date.now().toString(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productImage: selectedProduct.image,
      rating: reviewForm.rating,
      title: reviewForm.title,
      comment: reviewForm.comment,
      pros: reviewForm.pros ? reviewForm.pros.split(',').map(p => p.trim()) : [],
      cons: reviewForm.cons ? reviewForm.cons.split(',').map(c => c.trim()) : [],
      verified: true,
      helpful: 0,
      notHelpful: 0,
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    }

    setReviews([newReview, ...reviews])
    
    // Update purchased products
    setPurchasedProducts(purchasedProducts.map(p => 
      p.id === selectedProduct.id ? { ...p, reviewed: true } : p
    ))

    // Update stats
    setStats({
      ...stats,
      totalReviews: stats.totalReviews + 1,
      pendingReviews: stats.pendingReviews + 1
    })

    setShowReviewModal(false)
    setToastMessage('Review submitted successfully! You\'ll earn 50 points once approved.')
    setShowToast(true)
  }

  const handleVote = (reviewId: string, voteType: 'helpful' | 'not-helpful') => {
    setReviews(reviews.map(review => {
      if (review.id === reviewId) {
        const currentVote = review.userVote
        let helpful = review.helpful
        let notHelpful = review.notHelpful

        // Remove previous vote
        if (currentVote === 'helpful') helpful--
        if (currentVote === 'not-helpful') notHelpful--

        // Add new vote if different
        if (currentVote !== voteType) {
          if (voteType === 'helpful') helpful++
          if (voteType === 'not-helpful') notHelpful++
        }

        return {
          ...review,
          helpful,
          notHelpful,
          userVote: currentVote === voteType ? null : voteType
        }
      }
      return review
    }))
  }

  const deleteReview = (reviewId: string) => {
    setReviews(reviews.filter(r => r.id !== reviewId))
    setToastMessage('Review deleted successfully')
    setShowToast(true)
  }

  const getFilteredReviews = () => {
    let filtered = filterStatus === 'all' 
      ? reviews 
      : reviews.filter(r => r.status === filterStatus)

    // Sort reviews
    switch (sortBy) {
      case 'rating-high':
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'rating-low':
        filtered.sort((a, b) => a.rating - b.rating)
        break
      case 'helpful':
        filtered.sort((a, b) => b.helpful - a.helpful)
        break
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    return filtered
  }

  const renderStars = (rating: number, interactive: boolean = false, size: string = 'text-lg') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => interactive && setReviewForm({ ...reviewForm, rating: star })}
            disabled={!interactive}
            className={`${size} ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <span className={star <= rating ? 'text-yellow-500' : 'text-neutral-300'}>
              ★
            </span>
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-neutral-200 rounded w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Reviews & Ratings</h2>
        <p className="text-neutral-600">Manage your product reviews and earn rewards</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total Reviews</p>
              <p className="text-2xl font-bold mt-1">{stats.totalReviews}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">📝</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-600">Average Rating</p>
              <p className="text-2xl font-bold mt-1">{stats.averageRating.toFixed(1)}</p>
              <div className="mt-1">{renderStars(Math.round(stats.averageRating), false, 'text-sm')}</div>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-lg">⭐</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-600">Points Earned</p>
              <p className="text-2xl font-bold mt-1">{stats.pointsEarned}</p>
              <p className="text-xs text-green-600 mt-1">50 pts per review</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-lg">🎁</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-600">Helpful Votes</p>
              <p className="text-2xl font-bold mt-1">{stats.helpfulVotes}</p>
              <p className="text-xs text-purple-600 mt-1">From community</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-lg">👍</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'my-reviews', label: 'My Reviews', icon: '📋' },
          { id: 'write-review', label: 'Write Review', icon: '✍️' },
          { id: 'stats', label: 'Statistics', icon: '📊' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors
              ${activeTab === tab.id 
                ? 'bg-maroon-700 text-white' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'my-reviews' && stats.pendingReviews > 0 && (
              <Badge variant="warning" size="sm">{stats.pendingReviews}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* My Reviews Tab */}
      {activeTab === 'my-reviews' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <div className="p-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-1 border border-neutral-300 rounded-lg text-sm"
                >
                  <option value="all">All ({reviews.length})</option>
                  <option value="published">Published ({stats.publishedReviews})</option>
                  <option value="pending">Pending ({stats.pendingReviews})</option>
                  <option value="rejected">Rejected ({stats.rejectedReviews})</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1 border border-neutral-300 rounded-lg text-sm"
                >
                  <option value="recent">Most Recent</option>
                  <option value="rating-high">Highest Rating</option>
                  <option value="rating-low">Lowest Rating</option>
                  <option value="helpful">Most Helpful</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Reviews List */}
          {getFilteredReviews().length === 0 ? (
            <Card>
              <div className="p-6">
                <EmptyState
                  icon={
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  title="No reviews found"
                  description="Try adjusting your filters or write your first review"
                />
              </div>
            </Card>
          ) : (
            getFilteredReviews().map(review => (
              <Card key={review.id}>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <Image
                      src={review.productImage}
                      alt={review.productName}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{review.productName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            <Badge 
                              variant={
                                review.status === 'published' ? 'success' : 
                                review.status === 'pending' ? 'warning' : 'danger'
                              } 
                              size="sm"
                            >
                              {review.status}
                            </Badge>
                            {review.verified && (
                              <Badge variant="primary" size="sm">Verified Purchase</Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-neutral-600">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-medium mb-2">{review.title}</h4>
                      <p className="text-sm text-neutral-700 mb-3">{review.comment}</p>

                      {(review.pros && review.pros.length > 0) && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-green-700">Pros: </span>
                          <span className="text-sm text-neutral-600">{review.pros.join(', ')}</span>
                        </div>
                      )}

                      {(review.cons && review.cons.length > 0) && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-red-700">Cons: </span>
                          <span className="text-sm text-neutral-600">{review.cons.join(', ')}</span>
                        </div>
                      )}

                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {review.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedImages(review.images!)
                                setShowImageModal(true)
                              }}
                              className="w-16 h-16 rounded border border-neutral-300 overflow-hidden hover:opacity-80"
                            >
                              <Image
                                src={img}
                                alt={`Review image ${idx + 1}`}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {review.response && (
                        <div className="bg-neutral-50 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium mb-1">Store Response:</p>
                          <p className="text-sm text-neutral-700">{review.response.message}</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {new Date(review.response.date).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleVote(review.id, 'helpful')}
                            className={`
                              flex items-center gap-1 text-sm
                              ${review.userVote === 'helpful' ? 'text-green-600' : 'text-neutral-600 hover:text-green-600'}
                            `}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            Helpful ({review.helpful})
                          </button>
                          <button
                            onClick={() => handleVote(review.id, 'not-helpful')}
                            className={`
                              flex items-center gap-1 text-sm
                              ${review.userVote === 'not-helpful' ? 'text-red-600' : 'text-neutral-600 hover:text-red-600'}
                            `}
                          >
                            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            Not Helpful ({review.notHelpful})
                          </button>
                        </div>
                        {review.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteReview(review.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Write Review Tab */}
      {activeTab === 'write-review' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Products to Review</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Write reviews for your purchased products and earn 50 loyalty points per review!
              </p>
              
              {purchasedProducts.filter(p => !p.reviewed).length === 0 ? (
                <EmptyState
                  icon={
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                  title="No products to review"
                  description="You've reviewed all your purchased products"
                />
              ) : (
                <div className="space-y-3">
                  {purchasedProducts.filter(p => !p.reviewed).map(product => (
                    <div key={product.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-neutral-600">
                            Purchased on {new Date(product.purchaseDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-neutral-500">Order: {product.orderId}</p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleWriteReview(product)}
                      >
                        Write Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Review Guidelines</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Be honest and authentic</p>
                    <p className="text-sm text-neutral-600">Share your genuine experience with the product</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Include details</p>
                    <p className="text-sm text-neutral-600">Mention size, fit, quality, and value for money</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Add photos</p>
                    <p className="text-sm text-neutral-600">Visual reviews are more helpful to other shoppers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Avoid inappropriate content</p>
                    <p className="text-sm text-neutral-600">No profanity, personal information, or spam</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Review Statistics</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Rating Distribution */}
                <div>
                  <p className="text-sm font-medium mb-3">Rating Distribution</p>
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = reviews.filter(r => r.rating === rating).length
                    const percentage = (count / reviews.length) * 100 || 0
                    
                    return (
                      <div key={rating} className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1 w-16">
                          <span>{rating}</span>
                          <span className="text-yellow-500">★</span>
                        </div>
                        <div className="flex-1 bg-neutral-200 rounded-full h-2">
                          <div 
                            className="bg-maroon-700 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-neutral-600 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Status Breakdown */}
                <div>
                  <p className="text-sm font-medium mb-3">Review Status</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-700">Published</span>
                      <span className="text-lg font-bold text-green-700">{stats.publishedReviews}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm font-medium text-yellow-700">Pending</span>
                      <span className="text-lg font-bold text-yellow-700">{stats.pendingReviews}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-red-700">Rejected</span>
                      <span className="text-lg font-bold text-red-700">{stats.rejectedReviews}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Impact & Rewards</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <p className="text-3xl font-bold text-maroon-700 mb-2">{stats.helpfulVotes}</p>
                  <p className="text-sm text-neutral-600">People found your reviews helpful</p>
                </div>
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600 mb-2">{stats.pointsEarned}</p>
                  <p className="text-sm text-neutral-600">Total points earned</p>
                </div>
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    {stats.publishedReviews > 0 ? Math.round((stats.helpfulVotes / stats.publishedReviews)) : 0}
                  </p>
                  <p className="text-sm text-neutral-600">Avg. helpful votes per review</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Review Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-maroon-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">📝</span>
                    </div>
                    <div>
                      <p className="font-medium">Total Reviews Written</p>
                      <p className="text-sm text-neutral-600">All time</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-maroon-700">{stats.totalReviews}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">⭐</span>
                    </div>
                    <div>
                      <p className="font-medium">Average Rating Given</p>
                      <p className="text-sm text-neutral-600">Across all reviews</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-700">{stats.averageRating.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">👍</span>
                    </div>
                    <div>
                      <p className="font-medium">Helpful Votes Received</p>
                      <p className="text-sm text-neutral-600">From community</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-purple-700">{stats.helpfulVotes}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`Review: ${selectedProduct?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rating*</label>
            <div className="flex items-center gap-2">
              {renderStars(reviewForm.rating, true, 'text-3xl')}
              <span className="text-sm text-neutral-600 ml-2">
                {reviewForm.rating === 5 && 'Excellent'}
                {reviewForm.rating === 4 && 'Good'}
                {reviewForm.rating === 3 && 'Average'}
                {reviewForm.rating === 2 && 'Poor'}
                {reviewForm.rating === 1 && 'Terrible'}
              </span>
            </div>
          </div>

          <Input
            label="Review Title*"
            value={reviewForm.title}
            onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
            placeholder="Summarize your experience"
          />

          <div>
            <label className="block text-sm font-medium mb-2">Your Review*</label>
            <textarea
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              placeholder="Share details about your experience with the product"
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-700"
            />
          </div>

          <Input
            label="Pros (optional)"
            value={reviewForm.pros}
            onChange={(e) => setReviewForm({ ...reviewForm, pros: e.target.value })}
            placeholder="Comma-separated list (e.g., Good quality, True to size)"
          />

          <Input
            label="Cons (optional)"
            value={reviewForm.cons}
            onChange={(e) => setReviewForm({ ...reviewForm, cons: e.target.value })}
            placeholder="Comma-separated list (e.g., Runs small, Limited colors)"
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recommend"
              checked={reviewForm.recommendProduct}
              onChange={(e) => setReviewForm({ ...reviewForm, recommendProduct: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="recommend" className="text-sm">
              I would recommend this product to a friend
            </label>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              ✨ You'll earn <strong>50 loyalty points</strong> once your review is approved!
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowReviewModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              className="flex-1"
            >
              Submit Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Gallery Modal */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title="Review Photos"
      >
        <div className="grid grid-cols-2 gap-2">
          {selectedImages.map((img, idx) => (
            <Image
              key={idx}
              src={img}
              alt={`Review photo ${idx + 1}`}
              width={200}
              height={200}
              className="w-full rounded-lg"
            />
          ))}
        </div>
      </Modal>

      {/* Toast Alert */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert 
            variant="success" 
            className="shadow-lg"
          >
            {toastMessage}
          </Alert>
        </div>
      )}
    </div>
  )
}
