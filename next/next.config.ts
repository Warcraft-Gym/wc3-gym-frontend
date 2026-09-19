import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // The same dev proxy vite.config.js runs: /api/* reaches the backend with the prefix stripped.
    const target = process.env.PROXY_TARGET || "http://localhost:5002";
    return [
      { source: "/api/:path*", destination: `${target}/:path*` },
      // Clerk proxy mode: an app folder starting with _ is private, so the handler sits here.
      { source: "/__clerk/:path*", destination: "/clerk-proxy/:path*" },
    ];
  },
  async redirects() {
    // Career stats live on the players page.
    return [{ source: "/player-stats", destination: "/players", permanent: false }];
  },
};

export default nextConfig;
