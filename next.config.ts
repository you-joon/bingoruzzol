/** @type {import('next').NextConfig} */

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
  // 다른 config 옵션은 여기에
}

export default nextConfig