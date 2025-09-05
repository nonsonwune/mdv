/** @type {import('next').NextConfig} */
const imageDomains = (process.env.NEXT_PUBLIC_IMAGE_DOMAINS || "picsum.photos,images.unsplash.com,res.cloudinary.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const nextConfig = {
  reactStrictMode: true,
  // Note: API route configuration moved to individual API routes as needed
  // The 'api' key is not valid in next.config.mjs for Next.js 14+
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',

  // Fix for Railway deployment cache permission issues
  cacheHandler: process.env.NODE_ENV === 'production' && !process.env.DISABLE_CACHE ? './cache-handler.js' : undefined,
  cacheMaxMemorySize: process.env.DISABLE_CACHE ? 0 : undefined, // Disable in-memory cache if DISABLE_CACHE is set

  // Additional cache-related configurations for Railway deployment
  generateEtags: false, // Disable ETags to reduce cache complexity
  poweredByHeader: false, // Remove X-Powered-By header

  // Experimental features with cache fixes
  experimental: {
    typedRoutes: true,
    isrMemoryCacheSize: 0, // Disable ISR memory cache
  },
  images: {
    remotePatterns: imageDomains.map(hostname => ({
      protocol: 'https',
      hostname,
      pathname: '/**',
    })),
    // Enable rendering of SVGs from trusted sources only
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Hotfix: bypass Next.js Image optimizer so inline/API SVGs render
    unoptimized: true,
    // Remove deprecated domains configuration
  },
}

export default nextConfig

