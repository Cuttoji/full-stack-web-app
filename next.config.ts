import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Image Optimization */
  images: {
    // Enable modern image formats
    formats: ['image/avif', 'image/webp'],
    // Remote image domains (add your CDN/storage domains)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Image sizes for layout optimization
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum cache TTL (seconds)
    minimumCacheTTL: 60,
  },

  /* Security Headers */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        // Cache static assets
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  /* Performance Optimizations */
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion'],
  },

  /* Compression */
  compress: true,

  /* Production Source Maps (disable for smaller builds) */
  productionBrowserSourceMaps: false,
};

export default nextConfig;