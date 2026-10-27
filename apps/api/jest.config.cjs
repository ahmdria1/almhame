const transform = {
  "^.+\\.ts$": [
    "ts-jest",
    {
      tsconfig: {
        esModuleInterop: true,
        strict: false,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        resolveJsonModule: true,
      },
    },
  ],
};

const mapper = {
  "^@elawyer/types$": "<rootDir>/../../packages/types/src/index.ts",
};

module.exports = {
  testTimeout: 120000,
  collectCoverageFrom: ["src/domain/**/*.ts", "!src/domain/**/*.spec.ts"],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "text-summary", "json-summary"],
  coverageThreshold: {
    "./src/domain/": {
      lines: 90,
    },
  },
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/**/*.spec.ts"],
      transform,
      moduleNameMapper: mapper,
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/test/**/*.spec.ts"],
      globalSetup: "<rootDir>/test/global-setup.cjs",
      globalTeardown: "<rootDir>/test/global-teardown.cjs",
      setupFiles: ["<rootDir>/test/env.cjs"],
      transform,
      moduleNameMapper: mapper,
    },
  ],
};
