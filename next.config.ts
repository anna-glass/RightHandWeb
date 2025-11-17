import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', '@google-cloud/local-auth', 'google-auth-library'],
};

export default nextConfig;
