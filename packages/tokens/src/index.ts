export const colors = {
  navy900: "#0F1F3D",
  navy800: "#14284A",
  navy700: "#17345F",
  blue500: "#2F5597",
  blue100: "#E3EAF6",
  teal700: "#176373",
  teal600: "#1F7A8C",
  teal300: "#7CC8D4",
  teal100: "#E1F2F5",
  slate900: "#1E293B",
  slate700: "#334155",
  slate500: "#475569",
  slate400: "#94A3B8",
  slate300: "#CBD5E1",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",
  canvas: "#F8FAFC",
  white: "#FFFFFF",
  success: "#1E7B50",
  successSoft: "#E4F4EB",
  warning: "#334155",
  warningSoft: "#F1F5F9",
  danger: "#B42318",
  dangerSoft: "#FDEAE7",
  info: "#1D5FA8",
  infoSoft: "#E4EEF9",
} as const;

export const typeScale = {
  display: { size: 56, line: 76, weight: 700 },
  h1: { size: 40, line: 58, weight: 700 },
  h2: { size: 32, line: 48, weight: 700 },
  h3: { size: 24, line: 38, weight: 600 },
  h4: { size: 20, line: 32, weight: 600 },
  bodyL: { size: 18, line: 32, weight: 400 },
  body: { size: 16, line: 29, weight: 400 },
  label: { size: 14, line: 22, weight: 600 },
  caption: { size: 14, line: 22, weight: 400 },
} as const;

export const fonts = {
  ui: "Cairo",
  memo: "Noto Sans Arabic",
} as const;

export const rangeMeter = {
  from: "#17345F",
  to: "#1F7A8C",
} as const;
