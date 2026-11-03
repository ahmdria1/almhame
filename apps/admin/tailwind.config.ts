import type { Config } from "tailwindcss";
const tokens = require("../../packages/tokens/tokens.cjs");
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: tokens.colors.navy900, 800: tokens.colors.navy800, 700: tokens.colors.navy700 },
        teal: { 700: tokens.colors.teal700, 600: tokens.colors.teal600, 100: tokens.colors.teal100 },
        ink: { 900: tokens.colors.slate900, 700: tokens.colors.slate700, 500: tokens.colors.slate500, 200: tokens.colors.slate200, 100: tokens.colors.slate100 },
        canvas: tokens.colors.canvas,
        danger: tokens.colors.danger,
      },
      fontFamily: { cairo: ["Cairo", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
