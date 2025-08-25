"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { API_BASE } from '../lib/api'
import { formatNaira } from '../lib/format'
import type { Product } from '../lib/types'

// Modern Icons
const HeartIcon = ({ filled = false }) => (
  <svg className={`w-5 h-5 ${filled ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const BagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
)

const StarIcon = ({ filled = false }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

export default function ModernHomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [wishlist, setWishlist] = useState<Set<number>>(new Set())
  const { scrollY } = useScroll()
  
  // Parallax transforms
  const heroY = useTransform(scrollY, [0, 500], [0, 150])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1])

  useEffect(() => {
    loadProducts()
    loadWishlist()
  }, [])

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/products?page_size=12`)
      const data = await res.json()
      setProducts(data.items || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  function loadWishlist() {
    const saved = localStorage.getItem('mdv_wishlist')
    if (saved) {
      setWishlist(new Set(JSON.parse(saved)))
    }
  }

  function toggleWishlist(productId: number) {
    setWishlist(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      localStorage.setItem('mdv_wishlist', JSON.stringify(Array.from(newSet)))
      return newSet
    })
  }

  const categories = [
    { id: 'all', name: 'All Products', icon: '✨' },
    { id: 'men', name: 'Men', icon: '👔' },
    { id: 'women', name: 'Women', icon: '👗' },
    { id: 'essentials', name: 'Essentials', icon: '🎯' },
    { id: 'sale', name: 'Sale', icon: '🔥' },
  ]

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section with Parallax */}
      <motion.section 
        className="relative h-screen flex items-center justify-center overflow-hidden"
        style={{ y: heroY }}
      >
        {/* Video Background */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ scale: heroScale }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-10" />
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            poster="/api/placeholder/1920/1080"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
        </motion.div>

        {/* Hero Content */}
        <motion.div 
          className="relative z-20 text-center px-4 max-w-5xl mx-auto"
          style={{ opacity: heroOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <span className="inline-block px-6 py-2 mb-6 text-sm font-semibold tracking-wider text-white/90 uppercase bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              Summer Collection 2025
            </span>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-8xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <span className="block gradient-text">Redefine</span>
            <span className="block">Your Style</span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-white/80 mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            Discover premium fashion that speaks to your individuality. 
            Curated collections for the modern lifestyle.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <Link href="/shop">
              <button className="btn-modern px-10 py-4 text-lg">
                Shop Now
              </button>
            </Link>
            <Link href="/sale">
              <button className="btn-float px-10 py-4 text-lg bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white hover:text-black">
                View Sale
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-bounce" />
          </div>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, staggerChildren: 0.2 }}
            viewport={{ once: true }}
          >
            {[
              {
                icon: '🚚',
                title: 'Free Shipping',
                description: 'On orders above ₦50,000 to Lagos',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: '✨',
                title: 'Premium Quality',
                description: 'Carefully curated fashion pieces',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: '🔒',
                title: 'Secure Payment',
                description: 'Safe and encrypted transactions',
                color: 'from-green-500 to-emerald-500'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="glass-card p-8 text-center group cursor-pointer"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-3xl transform group-hover:rotate-12 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="py-10 px-4 sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <motion.button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid with Modern Cards */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-5xl font-bold mb-4">
              <span className="gradient-text">Trending Now</span>
            </h2>
            <p className="text-xl text-gray-600">Discover what everyone's talking about</p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="skeleton h-80 rounded-2xl" />
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <AnimatePresence>
                {products.map((product, index) => (
                  <ModernProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    isWishlisted={wishlist.has(product.id)}
                    onToggleWishlist={() => toggleWishlist(product.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 via-pink-600 to-red-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Stay in the Loop
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Get exclusive offers and be the first to know about new arrivals
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="input-modern flex-1"
              />
              <button type="submit" className="btn-modern bg-white text-purple-600 hover:bg-gray-100">
                Subscribe
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

// Modern Product Card Component
function ModernProductCard({ product, index, isWishlisted, onToggleWishlist }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="group relative"
      >
        <div className="glass-card overflow-hidden group cursor-pointer">
          {/* Image Container */}
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
            {/* Wishlist Button */}
            <motion.button
              onClick={(e) => {
                e.preventDefault()
                onToggleWishlist()
              }}
              className={`absolute top-4 right-4 z-10 p-2 rounded-full backdrop-blur-md transition-all ${
                isWishlisted 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <HeartIcon filled={isWishlisted} />
            </motion.button>

            {/* Sale Badge */}
            {product.compare_at_price && (
              <div className="absolute top-4 left-4 z-10">
                <span className="badge-modern bg-gradient-to-r from-red-500 to-pink-500">
                  {Math.round(((product.compare_at_price - product.variants[0]?.price) / product.compare_at_price) * 100)}% OFF
                </span>
              </div>
            )}

            {/* Product Image */}
            <Link href={`/product/${product.slug}`}>
              <div className="relative w-full h-full">
                {!imageLoaded && <div className="skeleton absolute inset-0" />}
                {product.images?.[0] && (
                  <Image
                    src={product.images[0].url}
                    alt={product.title}
                    fill
                    className={`object-cover transition-all duration-700 group-hover:scale-110 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Quick Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        setQuickViewOpen(true)
                      }}
                      className="flex-1 btn-modern py-2 text-sm"
                    >
                      Quick View
                    </button>
                    <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                      <BagIcon />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Product Info */}
          <div className="p-4">
            <Link href={`/product/${product.slug}`}>
              <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-purple-600 transition-colors">
                {product.title}
              </h3>
            </Link>
            
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
              {product.description}
            </p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} filled={i < 4} />
                ))}
              </div>
              <span className="text-xs text-gray-500">(4.5)</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-purple-600">
                {formatNaira(product.variants?.[0]?.price || 0)}
              </span>
              {product.compare_at_price && (
                <span className="text-sm text-gray-400 line-through">
                  {formatNaira(product.compare_at_price)}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewOpen && (
          <QuickViewModal
            product={product}
            onClose={() => setQuickViewOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Quick View Modal Component
function QuickViewModal({ product, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid md:grid-cols-2">
          {/* Image Section */}
          <div className="relative aspect-square bg-gray-100">
            {product.images?.[0] && (
              <Image
                src={product.images[0].url}
                alt={product.title}
                fill
                className="object-cover"
              />
            )}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Details Section */}
          <div className="p-8">
            <h2 className="text-3xl font-bold mb-2">{product.title}</h2>
            <p className="text-gray-600 mb-4">{product.description}</p>
            
            <div className="flex items-center gap-2 mb-6">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} filled={i < 4} />
                ))}
              </div>
              <span className="text-sm text-gray-500">(4.5 · 128 reviews)</span>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-purple-600">
                  {formatNaira(product.variants?.[0]?.price || 0)}
                </span>
                {product.compare_at_price && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatNaira(product.compare_at_price)}
                  </span>
                )}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Select Size</h3>
              <div className="flex gap-2">
                {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                  <button
                    key={size}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-purple-600 hover:text-purple-600 transition-colors"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 btn-modern py-3">
                Add to Cart
              </button>
              <button className="p-3 border-2 border-gray-200 rounded-full hover:border-purple-600 hover:text-purple-600 transition-colors">
                <HeartIcon />
              </button>
            </div>

            {/* Features */}
            <div className="mt-8 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>✓</span> Free shipping on orders over ₦50,000
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span> Easy 30-day returns
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span> Secure payment
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
