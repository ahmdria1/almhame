module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.spec.ts"],
  setupFiles: ["<rootDir>/test/setup.cjs"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          jsx: "react-jsx",
          strict: true,
          module: "commonjs",
          moduleResolution: "node",
          resolveJsonModule: true,
          isolatedModules: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@elawyer/types$": "<rootDir>/../../packages/types/src/index.ts",
    "^@elawyer/i18n$": "<rootDir>/../../packages/i18n/src/index.ts",
    "^next/image$": "<rootDir>/test/shims/image.tsx",
  },
};
