import { existsSync, readFileSync } from "fs";
import type { NextConfig } from "next";
import path from "path";

function loadRootEnv() {
  const file = path.join(__dirname, "../../.env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1);
  }
}

loadRootEnv();
if (!process.env.SITE_URL) throw new Error("SITE_URL is not set");

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  poweredByHeader: false,
  htmlLimitedBots: /.*/,
  transpilePackages: ["@elawyer/types", "@elawyer/i18n", "@elawyer/tokens", "@elawyer/api-client"],
  env: {
    NEXT_PUBLIC_BUILD_STAMP: process.env.BUILD_STAMP || "dev",
    SITE_URL: process.env.SITE_URL,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon" }];
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
