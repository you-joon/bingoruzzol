import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    // 💥 빌드 중 ESLint 오류 무시
    ignoreDuringBuilds: true,
  },
  // 다른 config 옵션은 여기에
}

export default nextConfig