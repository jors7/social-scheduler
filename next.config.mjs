/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Temporary fix for cookies issue during build
  outputFileTracing: false,
}

export default nextConfig