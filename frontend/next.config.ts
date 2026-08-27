import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
      "@/lib/api": path.resolve(__dirname, "src/lib/api.ts"),
      "@/lib/utils": path.resolve(__dirname, "src/lib/utils.ts"),
      "@/types": path.resolve(__dirname, "src/types/index.ts"),
    };
    return config;
  },
};

export default nextConfig;
