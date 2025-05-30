/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: false,
  },
  compiler: {
    styledComponents: true,
  },
  webpack: (config, { dev, isServer }) => {
    // 브라우저 호환성을 위한 설정
    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  images: {
    domains: ['localhost', 'springdalemusic.vercel.app'],
  },
};

export default nextConfig;
