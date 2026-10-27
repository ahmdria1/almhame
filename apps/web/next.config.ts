import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@elawyer/types", "@elawyer/i18n", "@elawyer/tokens", "@elawyer/api-client"],
  env: {
    NEXT_PUBLIC_BUILD_STAMP: process.env.BUILD_STAMP || "dev",
  },
  webpack: (config, { dev }) => {
    if (!dev) config.devtool = false;
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.join(__dirname, "src"),
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
