import type { Config } from "tailwindcss";
const tokens = require("../../packages/tokens/tokens.cjs");
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: tokens.colors.navy900, 800: tokens.colors.navy800, 700: tokens.colors.navy700 },
        teal: { 600: tokens.colors.teal600, 100: tokens.colors.teal100 },
        ink: { 500: tokens.colors.slate500, 200: tokens.colors.slate200, 100: tokens.colors.slate100 },
        canvas: tokens.colors.canvas,
      },
      fontFamily: { cairo: ["Cairo", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
