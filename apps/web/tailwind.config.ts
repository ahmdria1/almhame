import type { Config } from "tailwindcss";
const tokens = require("../../packages/tokens/tokens.cjs");

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: tokens.colors.navy900, 800: tokens.colors.navy800, 700: tokens.colors.navy700 },
        brand: { 500: tokens.colors.blue500, 100: tokens.colors.blue100 },
        teal: { 700: tokens.colors.teal700, 600: tokens.colors.teal600, 300: tokens.colors.teal300, 100: tokens.colors.teal100 },
        ink: { 900: tokens.colors.slate900, 700: tokens.colors.slate700, 500: tokens.colors.slate500, 400: tokens.colors.slate400, 300: tokens.colors.slate300, 200: tokens.colors.slate200, 100: tokens.colors.slate100 },
        canvas: tokens.colors.canvas,
        success: { DEFAULT: tokens.colors.success, soft: tokens.colors.successSoft },
        warning: { DEFAULT: tokens.colors.warning, soft: tokens.colors.warningSoft },
        danger: { DEFAULT: tokens.colors.danger, soft: tokens.colors.dangerSoft },
        info: { DEFAULT: tokens.colors.info, soft: tokens.colors.infoSoft },
      },
      fontFamily: { cairo: ["Cairo", "sans-serif"] },
      boxShadow: { card: "0 12px 40px rgba(15, 31, 61, 0.06)" },
    },
  },
  plugins: [],
};

export default config;
