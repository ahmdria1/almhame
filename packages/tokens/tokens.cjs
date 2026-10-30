const colors = {
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
};

const fontSize = {
  display: ["56px", { lineHeight: "76px", fontWeight: "700" }],
  h1: ["40px", { lineHeight: "58px", fontWeight: "700" }],
  h2: ["32px", { lineHeight: "48px", fontWeight: "700" }],
  h3: ["24px", { lineHeight: "38px", fontWeight: "600" }],
  h4: ["20px", { lineHeight: "32px", fontWeight: "600" }],
  bodyL: ["18px", { lineHeight: "32px", fontWeight: "400" }],
  body: ["16px", { lineHeight: "29px", fontWeight: "400" }],
  label: ["14px", { lineHeight: "22px", fontWeight: "600" }],
  caption: ["14px", { lineHeight: "22px", fontWeight: "400" }],
};

const fonts = {
  ui: "Cairo",
  memo: "Noto Sans Arabic",
};

const rangeMeter = {
  from: "#17345F",
  to: "#1F7A8C",
};

module.exports = { colors, fontSize, fonts, rangeMeter };
