import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: {
    // Allow E2E builds to proceed without blocking on ESLint
    // This is enabled only when E2E_TESTS=true
    ignoreDuringBuilds: process.env.E2E_TESTS === "true",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
}

export default nextConfig
