/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@my-ridings/elevation-profile", "@my-ridings/plan-geometry"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  skipTrailingSlashRedirect: true,
}

export default nextConfig