import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gdf/shared'],
  // standalone output keeps the self-hosted footprint small (1 GB RAM target)
  output: 'standalone',
  images: {
    // logo + badge art are SVGs served from /public
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
