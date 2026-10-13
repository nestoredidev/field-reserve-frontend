import type { NextConfig } from "next";

// El backend Spring Boot no expone CORS: el frontend lo consume a través de este proxy.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/v2/:path*",
        destination: `${BACKEND_URL}/api/v2/:path*`,
      },
    ];
  },
};

export default nextConfig;
