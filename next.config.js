/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ============================================
  // PRODUCTION SECURITY SETTINGS
  // ============================================

  // Disable X-Powered-By header (security through obscurity)
  poweredByHeader: false,

  // Security Headers (additional headers applied at build time)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      },
      // Stricter CSP for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; frame-ancestors 'none'"
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        ]
      }
    ]
  },

  // Compress responses
  compress: true,

  // Experimental features for better security
  experimental: {
    // Enable server actions protection
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },

  // Environment variables that are safe to expose (validated)
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV,
  },

  // Redirects for security
  async redirects() {
    return [
      // Redirect common attack paths
      {
        source: '/wp-admin/:path*',
        destination: '/404',
        permanent: true,
      },
      {
        source: '/wp-login.php',
        destination: '/404',
        permanent: true,
      },
      {
        source: '/.env',
        destination: '/404',
        permanent: true,
      },
      {
        source: '/config.php',
        destination: '/404',
        permanent: true,
      },
    ]
  }
}

module.exports = nextConfig
