import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // PROXY_TARGET sends /api/* to a backend with the prefix stripped; production reads an
    // absolute backend URL instead, so the proxy exists only where the variable names a target.
    const target = process.env.PROXY_TARGET;
    return [
      ...(target ? [{ source: "/api/:path*", destination: `${target}/:path*` }] : []),
    ];
  },
  async redirects() {
    // Career stats live on the players page.
    return [{ source: "/player-stats", destination: "/players", permanent: false }];
  },
};

export default nextConfig;
