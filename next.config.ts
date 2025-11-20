import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', '@google-cloud/local-auth', 'google-auth-library'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
