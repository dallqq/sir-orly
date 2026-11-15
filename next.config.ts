import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
