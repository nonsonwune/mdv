"use client"

import { useState, useEffect } from 'react'
import { Card, Button, Badge, ProgressBar, EmptyState, Modal, Toast } from '../ui'
import { formatNaira } from '../../lib/format'
import type { UserData } from './UserProfile'

interface LoyaltyTier {
  name: string
  minSpend: number
  maxSpend: number
  benefits: string[]
  pointsMultiplier: number
  color: string
  icon: string
}

interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  value: number
  type: 'discount' | 'free-shipping' | 'gift' | 'exclusive'
  code?: string
  expiresAt?: string
  imageUrl?: string
  available: boolean
}

interface PointsActivity {
  id: string
  date: string
  description: string
  points: number
  type: 'earned' | 'redeemed' | 'expired'
  orderId?: string
}

interface LoyaltyStats {
  currentPoints: number
  lifetimePoints: number
  currentTier: string
  nextTier: string | null
  pointsToNextTier: number
  tierProgress: number
  expiringPoints: number
  expiringDate: string | null
}

interface LoyaltyProgramProps {
  user: UserData
}

const LOYALTY_TIERS: Record<string, LoyaltyTier> = {
  bronze: {
    name: 'Bronze',
    minSpend: 0,
    maxSpend: 100000,
    benefits: [
      '1 point per ₦100 spent',
      'Birthday bonus points',
      'Early access to sales'
    ],
    pointsMultiplier: 1,
    color: 'orange',
    icon: '🥉'
  },
  silver: {
    name: 'Silver',
    minSpend: 100000,
    maxSpend: 500000,
    benefits: [
      '1.5 points per ₦100 spent',
      'Free shipping on orders over ₦50,000',
      'Exclusive member promotions',
      'Birthday 2x points'
    ],
    pointsMultiplier: 1.5,
    color: 'gray',
    icon: '🥈'
  },
  gold: {
    name: 'Gold',
    minSpend: 500000,
    maxSpend: 1000000,
    benefits: [
      '2 points per ₦100 spent',
      'Free shipping on all orders',
      'VIP customer service',
      'Exclusive previews',
      'Birthday 3x points'
    ],
    pointsMultiplier: 2,
    color: 'yellow',
    icon: '🥇'
  },
  platinum: {
    name: 'Platinum',
    minSpend: 1000000,
    maxSpend: Infinity,
    benefits: [
      '3 points per ₦100 spent',
      'Free express shipping',
      'Personal stylist consultation',
      'Private sales access',
      'Birthday week celebration',
      'Complimentary alterations'
    ],
    pointsMultiplier: 3,
    color: 'purple',
    icon: '💎'
  }
}

export default function LoyaltyProgram({ user }: LoyaltyProgramProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'activity' | 'benefits'>('overview')
  const [stats, setStats] = useState<LoyaltyStats>({
    currentPoints: 0,
    lifetimePoints: 0,
    currentTier: 'bronze',
    nextTier: 'silver',
    pointsToNextTier: 0,
    tierProgress: 0,
    expiringPoints: 0,
    expiringDate: null
  })
  const [rewards, setRewards] = useState<Reward[]>([])
  const [activities, setActivities] = useState<PointsActivity[]>([])
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLoyaltyData()
  }, [])

  const loadLoyaltyData = () => {
    // Load orders to calculate points
    const orders = JSON.parse(localStorage.getItem('mdv_orders') || '[]')
    const totalSpent = orders.reduce((sum: number, order: any) => sum + order.total, 0)
    
    // Determine tier based on total spent
    let currentTier = 'bronze'
    let nextTier: string | null = 'silver'
    
    if (totalSpent >= 1000000) {
      currentTier = 'platinum'
      nextTier = null
    } else if (totalSpent >= 500000) {
      currentTier = 'gold'
      nextTier = 'platinum'
    } else if (totalSpent >= 100000) {
      currentTier = 'silver'
      nextTier = 'gold'
    }
    
    // Calculate points
    const tier = LOYALTY_TIERS[currentTier]
    const lifetimePoints = Math.floor((totalSpent / 100) * tier.pointsMultiplier)
    const currentPoints = lifetimePoints - 500 // Assume some points were redeemed
    
    // Calculate progress to next tier
    const nextTierObj = nextTier ? LOYALTY_TIERS[nextTier] : null
    const pointsToNextTier = nextTierObj ? nextTierObj.minSpend - totalSpent : 0
    const tierProgress = nextTierObj 
      ? ((totalSpent - tier.minSpend) / (nextTierObj.minSpend - tier.minSpend)) * 100
      : 100
    
    setStats({
      currentPoints: Math.max(currentPoints, 0),
      lifetimePoints,
      currentTier,
      nextTier,
      pointsToNextTier: Math.max(pointsToNextTier, 0),
      tierProgress: Math.min(tierProgress, 100),
      expiringPoints: 250,
      expiringDate: '2024-03-31'
    })
    
    // Load rewards
    setRewards(generateRewards(currentPoints))
    
    // Load activities
    setActivities(generateActivities())
    
    setLoading(false)
  }

  const generateRewards = (availablePoints: number): Reward[] => {
    return [
      {
        id: '1',
        name: '₦5,000 Off',
        description: 'Get ₦5,000 off your next purchase',
        pointsCost: 500,
        value: 5000,
        type: 'discount',
        available: availablePoints >= 500,
        imageUrl: '/api/placeholder/100/100'
      },
      {
        id: '2',
        name: 'Free Shipping',
        description: 'Free standard shipping on your next order',
        pointsCost: 200,
        value: 2000,
        type: 'free-shipping',
        available: availablePoints >= 200,
        imageUrl: '/api/placeholder/100/100'
      },
      {
        id: '3',
        name: '10% Off Coupon',
        description: '10% off your entire purchase',
        pointsCost: 750,
        value: 0,
        type: 'discount',
        available: availablePoints >= 750,
        imageUrl: '/api/placeholder/100/100'
      },
      {
        id: '4',
        name: 'VIP Early Access',
        description: '48-hour early access to sales',
        pointsCost: 1000,
        value: 0,
        type: 'exclusive',
        available: availablePoints >= 1000,
        imageUrl: '/api/placeholder/100/100'
      },
      {
        id: '5',
        name: 'Birthday Gift',
        description: 'Special birthday surprise package',
        pointsCost: 1500,
        value: 10000,
        type: 'gift',
        available: availablePoints >= 1500,
        imageUrl: '/api/placeholder/100/100'
      },
      {
        id: '6',
        name: '₦10,000 Off',
        description: 'Get ₦10,000 off orders over ₦50,000',
        pointsCost: 900,
        value: 10000,
        type: 'discount',
        available: availablePoints >= 900,
        imageUrl: '/api/placeholder/100/100'
      }
    ]
  }

  const generateActivities = (): PointsActivity[] => {
    const activities: PointsActivity[] = [
      {
        id: '1',
        date: '2024-01-20',
        description: 'Order #ORD-2024-001',
        points: 450,
        type: 'earned',
        orderId: 'ORD-2024-001'
      },
      {
        id: '2',
        date: '2024-01-15',
        description: 'Redeemed: Free Shipping',
        points: -200,
        type: 'redeemed'
      },
      {
        id: '3',
        date: '2024-01-10',
        description: 'Order #ORD-2024-002',
        points: 320,
        type: 'earned',
        orderId: 'ORD-2024-002'
      },
      {
        id: '4',
        date: '2024-01-05',
        description: 'Birthday Bonus',
        points: 500,
        type: 'earned'
      },
      {
        id: '5',
        date: '2024-01-01',
        description: 'New Year Promotion',
        points: 100,
        type: 'earned'
      },
      {
        id: '6',
        date: '2023-12-31',
        description: 'Points Expired',
        points: -150,
        type: 'expired'
      }
    ]
    
    return activities.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  const handleRedeemReward = (reward: Reward) => {
    if (!reward.available) {
      setToastMessage('Not enough points to redeem this reward')
      setShowToast(true)
      return
    }
    
    setSelectedReward(reward)
    setShowRedeemModal(true)
  }

  const confirmRedemption = () => {
    if (!selectedReward) return
    
    // Generate reward code
    const code = `MDV${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    // Update points
    const newPoints = stats.currentPoints - selectedReward.pointsCost
    setStats({ ...stats, currentPoints: newPoints })
    
    // Add to activities
    const newActivity: PointsActivity = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      description: `Redeemed: ${selectedReward.name}`,
      points: -selectedReward.pointsCost,
      type: 'redeemed'
    }
    setActivities([newActivity, ...activities])
    
    // Update rewards availability
    setRewards(generateRewards(newPoints))
    
    // Show success message
    setToastMessage(`Reward redeemed! Your code is: ${code}`)
    setShowToast(true)
    setShowRedeemModal(false)
    setSelectedReward(null)
  }

  const currentTierData = LOYALTY_TIERS[stats.currentTier]
  const nextTierData = stats.nextTier ? LOYALTY_TIERS[stats.nextTier] : null

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
        <h2 className="text-2xl font-bold mb-2">Loyalty Program</h2>
        <p className="text-neutral-600">Earn points, unlock rewards, and enjoy exclusive benefits</p>
      </div>

      {/* Points Overview Card */}
      <Card className="bg-gradient-to-r from-maroon-700 to-maroon-800 text-white">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm opacity-90 mb-1">Available Points</p>
              <p className="text-4xl font-bold">{stats.currentPoints.toLocaleString()}</p>
              <p className="text-sm opacity-75 mt-1">
                Lifetime earned: {stats.lifetimePoints.toLocaleString()} points
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <span className="text-2xl">{currentTierData.icon}</span>
                <span className="font-semibold">{currentTierData.name}</span>
              </div>
              <p className="text-xs opacity-75 mt-2">
                {currentTierData.pointsMultiplier}x points per ₦100
              </p>
            </div>
          </div>
          
          {stats.expiringPoints > 0 && (
            <div className="bg-white/10 rounded-lg p-3 mb-4">
              <p className="text-sm">
                ⚠️ {stats.expiringPoints} points expiring on {stats.expiringDate}
              </p>
            </div>
          )}
          
          {nextTierData && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to {nextTierData.name}</span>
                <span>{stats.tierProgress.toFixed(0)}%</span>
              </div>
              <ProgressBar 
                value={stats.tierProgress} 
                className="mb-2"
                color="white"
              />
              <p className="text-xs opacity-75">
                Spend {formatNaira(stats.pointsToNextTier)} more to reach {nextTierData.name} tier
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'rewards', label: 'Rewards', icon: '🎁' },
          { id: 'activity', label: 'Activity', icon: '📝' },
          { id: 'benefits', label: 'Benefits', icon: '⭐' }
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
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">How to Earn Points</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600">₦</span>
                    </div>
                    <div>
                      <p className="font-medium">Shop & Earn</p>
                      <p className="text-sm text-neutral-600">
                        Earn {currentTierData.pointsMultiplier} point{currentTierData.pointsMultiplier > 1 ? 's' : ''} for every ₦100 spent
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600">🎂</span>
                    </div>
                    <div>
                      <p className="font-medium">Birthday Bonus</p>
                      <p className="text-sm text-neutral-600">
                        Get {currentTierData.pointsMultiplier === 1 ? '2x' : `${currentTierData.pointsMultiplier + 1}x`} points during your birthday month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600">📝</span>
                    </div>
                    <div>
                      <p className="font-medium">Write Reviews</p>
                      <p className="text-sm text-neutral-600">
                        Earn 50 points for each product review
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600">👥</span>
                    </div>
                    <div>
                      <p className="font-medium">Refer Friends</p>
                      <p className="text-sm text-neutral-600">
                        Get 500 points when a friend makes their first purchase
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Points Value</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <p className="text-2xl font-bold text-maroon-700">
                      100 points = {formatNaira(1000)}
                    </p>
                    <p className="text-sm text-neutral-600 mt-1">
                      Standard redemption rate
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Your {stats.currentPoints} points value:</span>
                      <span className="font-semibold">
                        {formatNaira(stats.currentPoints * 10)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Maximum discount per order:</span>
                      <span className="font-semibold">50%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Points expiry:</span>
                      <span className="font-semibold">12 months</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Tier Progression */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Tier Progression</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(LOYALTY_TIERS).map(([key, tier]) => {
                  const isCurrentTier = key === stats.currentTier
                  const isPastTier = tier.maxSpend <= currentTierData.minSpend
                  
                  return (
                    <div 
                      key={key}
                      className={`
                        p-4 rounded-lg border-2 text-center transition-colors
                        ${isCurrentTier 
                          ? 'border-maroon-700 bg-maroon-50' 
                          : isPastTier
                          ? 'border-green-500 bg-green-50'
                          : 'border-neutral-300 bg-white'
                        }
                      `}
                    >
                      <div className="text-3xl mb-2">{tier.icon}</div>
                      <p className="font-semibold">{tier.name}</p>
                      <p className="text-xs text-neutral-600 mt-1">
                        {tier.minSpend === 0 ? 'Starter' : `₦${(tier.minSpend / 1000).toFixed(0)}k+`}
                      </p>
                      {isCurrentTier && (
                        <Badge variant="primary" size="sm" className="mt-2">
                          Current
                        </Badge>
                      )}
                      {isPastTier && !isCurrentTier && (
                        <Badge variant="success" size="sm" className="mt-2">
                          Achieved
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => (
            <Card key={reward.id} className={!reward.available ? 'opacity-60' : ''}>
              <div className="p-4">
                <div className="aspect-square bg-neutral-100 rounded-lg mb-3 flex items-center justify-center">
                  {reward.type === 'discount' && '🏷️'}
                  {reward.type === 'free-shipping' && '📦'}
                  {reward.type === 'gift' && '🎁'}
                  {reward.type === 'exclusive' && '⭐'}
                  <span className="text-4xl">{reward.name.includes('Off') && '💰'}</span>
                </div>
                <h4 className="font-semibold mb-1">{reward.name}</h4>
                <p className="text-sm text-neutral-600 mb-3">{reward.description}</p>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-maroon-700">
                      {reward.pointsCost} pts
                    </p>
                    {reward.value > 0 && (
                      <p className="text-xs text-neutral-600">
                        Value: {formatNaira(reward.value)}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant={reward.available ? 'success' : 'secondary'} 
                    size="sm"
                  >
                    {reward.available ? 'Available' : 'Locked'}
                  </Badge>
                </div>
                <Button
                  variant={reward.available ? 'primary' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => handleRedeemReward(reward)}
                  disabled={!reward.available}
                >
                  {reward.available ? 'Redeem' : `Need ${reward.pointsCost - stats.currentPoints} more pts`}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Points History</h3>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
            
            {activities.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="No activity yet"
                description="Your points activity will appear here"
              />
            ) : (
              <div className="space-y-3">
                {activities.map(activity => (
                  <div 
                    key={activity.id} 
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${activity.type === 'earned' 
                          ? 'bg-green-100 text-green-600' 
                          : activity.type === 'redeemed'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-red-100 text-red-600'
                        }
                      `}>
                        {activity.type === 'earned' && '+'}
                        {activity.type === 'redeemed' && '↓'}
                        {activity.type === 'expired' && '×'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.description}</p>
                        <p className="text-xs text-neutral-600">
                          {new Date(activity.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`
                        font-bold
                        ${activity.points > 0 ? 'text-green-600' : 'text-red-600'}
                      `}>
                        {activity.points > 0 ? '+' : ''}{activity.points}
                      </p>
                      <p className="text-xs text-neutral-600">points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Benefits Tab */}
      {activeTab === 'benefits' && (
        <div className="space-y-6">
          {Object.entries(LOYALTY_TIERS).map(([key, tier]) => {
            const isCurrentTier = key === stats.currentTier
            const isPastTier = tier.maxSpend <= currentTierData.minSpend
            const isLocked = !isPastTier && !isCurrentTier
            
            return (
              <Card 
                key={key} 
                className={isCurrentTier ? 'ring-2 ring-maroon-700' : ''}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{tier.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {tier.name} Tier
                          {isCurrentTier && (
                            <Badge variant="primary" size="sm">Current</Badge>
                          )}
                          {isPastTier && !isCurrentTier && (
                            <Badge variant="success" size="sm">Unlocked</Badge>
                          )}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          {tier.minSpend === 0 
                            ? 'Welcome tier' 
                            : `Spend ${formatNaira(tier.minSpend)} to unlock`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-maroon-700">
                        {tier.pointsMultiplier}x
                      </p>
                      <p className="text-xs text-neutral-600">points</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {tier.benefits.map((benefit, index) => (
                      <div 
                        key={index}
                        className={`
                          flex items-start gap-2 
                          ${isLocked ? 'opacity-50' : ''}
                        `}
                      >
                        <svg 
                          className={`
                            w-5 h-5 flex-shrink-0 mt-0.5
                            ${isLocked ? 'text-neutral-400' : 'text-green-600'}
                          `} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M5 13l4 4L19 7" 
                          />
                        </svg>
                        <p className="text-sm">{benefit}</p>
                      </div>
                    ))}
                  </div>
                  
                  {isLocked && (
                    <div className="mt-4 p-3 bg-neutral-100 rounded-lg">
                      <p className="text-sm text-neutral-600">
                        Spend {formatNaira(tier.minSpend - currentTierData.maxSpend)} more to unlock this tier
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Redeem Modal */}
      <Modal
        isOpen={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
        title="Confirm Redemption"
      >
        {selectedReward && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-5xl mb-4">
                {selectedReward.type === 'discount' && '🏷️'}
                {selectedReward.type === 'free-shipping' && '📦'}
                {selectedReward.type === 'gift' && '🎁'}
                {selectedReward.type === 'exclusive' && '⭐'}
              </div>
              <h3 className="text-lg font-semibold mb-2">{selectedReward.name}</h3>
              <p className="text-sm text-neutral-600 mb-4">{selectedReward.description}</p>
              <div className="inline-flex items-center gap-4 p-3 bg-neutral-100 rounded-lg">
                <div>
                  <p className="text-xs text-neutral-600">Cost</p>
                  <p className="text-lg font-bold text-maroon-700">
                    {selectedReward.pointsCost} pts
                  </p>
                </div>
                {selectedReward.value > 0 && (
                  <>
                    <div className="w-px h-8 bg-neutral-300" />
                    <div>
                      <p className="text-xs text-neutral-600">Value</p>
                      <p className="text-lg font-bold">{formatNaira(selectedReward.value)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Current Points</span>
                <span className="font-semibold">{stats.currentPoints}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Redemption Cost</span>
                <span className="font-semibold text-red-600">-{selectedReward.pointsCost}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Points After</span>
                <span>{stats.currentPoints - selectedReward.pointsCost}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRedeemModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRedemption}
                className="flex-1"
              >
                Confirm Redemption
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
