/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    domains: ['maps.googleapis.com', 'public.blob.vercel-storage.com'],
  },
}

module.exports = nextConfig
