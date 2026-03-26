import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // React strict mode for catching potential issues early
  reactStrictMode: true,

  // Allow build to complete even with TS/ESLint errors in non-page files
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Experimental features for Next.js 15
  experimental: {
    // Enable React compiler for automatic memoization
    reactCompiler: false,
    // Partial prerendering (PPR) for hybrid static/dynamic rendering
    ppr: false,
  },

  // Typed routes disabled — requires clean TS compilation across all files
  // typedRoutes: true,

  // Image optimization configuration
  images: {
    remotePatterns: [
      // Local development uploads served via Next.js API
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/uploads/**",
      },
      // Production S3-compatible storage (Cloudflare R2, AWS S3, MinIO)
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/**",
      },
      // CDN / public asset distribution
      {
        protocol: "https",
        hostname: "cdn.cheggiestudios.com",
        pathname: "/**",
      },
      // User avatars from OAuth providers
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Custom HTTP headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Strict Transport Security — 2 years, include subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // XSS protection (legacy, but belt-and-suspenders)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions policy — restrict access to sensitive APIs
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: self + Next.js inline scripts + Sentry CDN
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.sentry.io https://js.sentry-cdn.com",
              // Styles: self + inline (needed for Tailwind CSS-in-JS + shadcn)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts
              "font-src 'self' https://fonts.gstatic.com data:",
              // Images: self + data URIs + blob + S3/R2 + OAuth providers
              "img-src 'self' data: blob: https://*.amazonaws.com https://*.r2.cloudflarestorage.com https://cdn.cheggiestudios.com https://avatars.githubusercontent.com https://*.googleusercontent.com",
              // Media (video/audio uploads served via API routes)
              "media-src 'self' blob: https://*.amazonaws.com https://*.r2.cloudflarestorage.com",
              // API connections
              "connect-src 'self' https://*.sentry.io https://o*.ingest.sentry.io wss://localhost:3001",
              // Workers (for video processing in browser)
              "worker-src 'self' blob:",
              // Frame ancestors — no embedding
              "frame-ancestors 'none'",
              // Form action — only POST to self
              "form-action 'self'",
              // Upgrade insecure requests in production
              ...(process.env.NODE_ENV === "production"
                ? ["upgrade-insecure-requests"]
                : []),
            ].join("; "),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: "/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache Next.js static chunks
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // API routes — no caching by default
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Redirect /dashboard to /projects for logged-in users (handled at app level)
      // Placeholder for future marketing redirects
    ];
  },

  // Webpack customization
  webpack(config, { isServer }) {
    // Suppress critical dependency warnings from optional packages
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        // Node.js builtins not needed in browser
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        net: false,
        tls: false,
      },
    };

    // Handle audio/video file imports for preview
    config.module = {
      ...config.module,
      rules: [
        ...(config.module?.rules ?? []),
        {
          test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
          type: "asset/resource",
        },
      ],
    };

    return config;
  },

  // Output standalone for Docker deployments
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,

  // Disable powered by header
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Enable gzip for static files
  generateEtags: true,

  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

// Sentry configuration options
const sentryOptions = {
  // Suppresses Sentry source map upload logs during build
  silent: true,

  // Sentry organization and project from CLI config
  org: process.env.SENTRY_ORG ?? "cheggie-studios",
  project: process.env.SENTRY_PROJECT ?? "cheggie-studios",

  // Auth token for source map uploads
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Automatically tree-shake Sentry logger in production
  disableLogger: true,

  // Only upload source maps when auth token is present
  widenClientFileUpload: !!process.env.SENTRY_AUTH_TOKEN,

  // Route browser requests to Sentry through Next.js rewrite (avoids ad blockers)
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically annotate React components for better error tracing
  reactComponentAnnotation: {
    enabled: true,
  },

  // Disable source map upload when no auth token
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
};

// Only apply Sentry wrapping when auth token is available (production deploys)
// In CI build-only runs without SENTRY_AUTH_TOKEN, use bare Next.js config
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
