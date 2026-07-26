import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gdf/shared'],
  // standalone output keeps the self-hosted footprint small (1 GB RAM target)
  output: 'standalone',
};

export default nextConfig;
