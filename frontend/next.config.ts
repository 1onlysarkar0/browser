import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:5000",
    "*.sisko.replit.dev",
    "*.replit.dev",
    "*.repl.co",
    "*.kirk.replit.dev",
    "*.picard.replit.dev",
  ],
  output: process.env.NEXT_OUTPUT_MODE as "standalone" | "export" | undefined,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
