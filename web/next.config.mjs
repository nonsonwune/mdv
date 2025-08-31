/** @type {import('next').NextConfig} */
const imageDomains = (process.env.NEXT_PUBLIC_IMAGE_DOMAINS || "picsum.photos,images.unsplash.com,res.cloudinary.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // Increase API route timeout for admin operations
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
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

