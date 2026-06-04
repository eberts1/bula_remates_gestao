import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@docs/shared'],
};

export default nextConfig;
