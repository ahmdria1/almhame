module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: { esModuleInterop: true, resolveJsonModule: true, strict: true } }],
  },
  moduleNameMapper: {
    "^@elawyer/types$": "<rootDir>/../types/src/index.ts",
  },
};
