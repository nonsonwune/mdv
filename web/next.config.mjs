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
    // Remove deprecated domains configuration
  },
}

export default nextConfig

