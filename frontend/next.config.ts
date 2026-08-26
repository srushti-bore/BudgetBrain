import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
  turbopack: {
    resolveAlias: {
      "@/lib/api": "./src/lib/api.ts",
      "@/lib/utils": "./src/lib/utils.ts",
      "@/types": "./src/types/index.ts",
    },
  },
};

export default nextConfig;
