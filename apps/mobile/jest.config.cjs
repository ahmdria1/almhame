module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: { esModuleInterop: true, resolveJsonModule: true, strict: false } }],
  },
  moduleNameMapper: {
    "^@elawyer/i18n$": "<rootDir>/../../packages/i18n/src/index.ts",
    "^@elawyer/types$": "<rootDir>/../../packages/types/src/index.ts",
  },
};
