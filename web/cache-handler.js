/**
 * Custom Next.js Cache Handler for Railway Deployment
 * 
 * Fixes EACCES permission denied errors when Next.js tries to write to /app/.next/cache
 * in Railway's containerized environment. This handler uses in-memory caching instead
 * of filesystem caching to avoid permission issues.
 */

const { LRUCache } = require('lru-cache')

// In-memory cache with size limits to prevent memory leaks
const cache = new LRUCache({
  max: 500, // Maximum number of items
  maxSize: 50 * 1024 * 1024, // 50MB max total size
  sizeCalculation: (value) => {
    return JSON.stringify(value).length
  },
  ttl: 1000 * 60 * 60, // 1 hour TTL
})

class MemoryCacheHandler {
  constructor(options) {
    this.options = options
    console.log('MemoryCacheHandler initialized for Railway deployment')
  }

  async get(key) {
    try {
      const value = cache.get(key)
      if (value) {
        console.log(`Cache HIT for key: ${key}`)
        return value
      }
      console.log(`Cache MISS for key: ${key}`)
      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(key, data, ctx) {
    try {
      // Set TTL based on context or use default
      const ttl = ctx?.revalidate ? ctx.revalidate * 1000 : 1000 * 60 * 60 // 1 hour default
      
      cache.set(key, data, { ttl })
      console.log(`Cache SET for key: ${key}, TTL: ${ttl}ms`)
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  async revalidateTag(tag) {
    try {
      // Find and remove all entries with this tag
      let removedCount = 0
      for (const [key, value] of cache.entries()) {
        if (value && value.tags && value.tags.includes(tag)) {
          cache.delete(key)
          removedCount++
        }
      }
      console.log(`Cache revalidated tag: ${tag}, removed ${removedCount} entries`)
      return true
    } catch (error) {
      console.error('Cache revalidateTag error:', error)
      return false
    }
  }

  async delete(key) {
    try {
      const deleted = cache.delete(key)
      console.log(`Cache DELETE for key: ${key}, success: ${deleted}`)
      return deleted
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }
}

module.exports = MemoryCacheHandler
