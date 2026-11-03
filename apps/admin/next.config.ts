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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://emuhami.com https://admin.emuhami.com http://127.0.0.1:4710 http://localhost:4710",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
