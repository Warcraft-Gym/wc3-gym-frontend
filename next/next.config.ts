import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// The 42 unchanged helpers live one folder up, so the bundler root is the repo root.
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
    // A helper one folder up sees no node_modules of its own, so its packages are named here.
    // ponytail: one line per package the helpers import; the list ends when they move under next/
    resolveAlias: {
      luxon: "./node_modules/luxon",
      "d3-time-format": "./node_modules/d3-time-format",
      "country-code-info/data/countries.json": "./node_modules/country-code-info/data/countries.json",
      "d3-time-format": "./node_modules/d3-time-format",
    },
  },
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
