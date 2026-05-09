/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  env: {
    MCH_TARGET: 'cloud',
  },
};

export default nextConfig;
