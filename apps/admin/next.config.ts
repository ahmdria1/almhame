import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  poweredByHeader: false,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  transpilePackages: ["@elawyer/i18n", "@elawyer/tokens", "@elawyer/types"],
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
    return config;
  },
};

export default nextConfig;
