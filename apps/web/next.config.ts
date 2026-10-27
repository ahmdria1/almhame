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
  webpack: (config, { dev, isServer }) => {
    if (!dev) config.devtool = false;
    if (!dev && !isServer) {
      const WebpackObfuscator = require("webpack-obfuscator");
      config.plugins.push(
        new WebpackObfuscator(
          {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            debugProtection: false,
            selfDefending: false,
            simplify: true,
            stringArray: true,
            stringArrayThreshold: 0.75,
          },
          ["framework-*.js", "main-*.js", "webpack-*.js", "polyfills-*.js", "vendor-*.js"],
        ),
      );
    }
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
