/** @type {import('next').NextConfig} */
const nextConfig = {
  // 기존 설정들...
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;