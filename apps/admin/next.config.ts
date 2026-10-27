import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  poweredByHeader: false,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  transpilePackages: ["@elawyer/i18n", "@elawyer/tokens", "@elawyer/types"],
  webpack: (config, { dev }) => {
    if (!dev) config.devtool = false;
    return config;
  },
};

export default nextConfig;
