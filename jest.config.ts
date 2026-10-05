export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  // The @mairie360/core-api-openapi client is published as TypeScript ESM (orval): ts-jest has to
  // compile it so the tests go through the real HTTP client. Its declarations are not type-checked,
  // nor are those of src/clients/coreClient.ts: under ts-jest, axios is typed through both index.d.ts
  // and index.d.cts there, while `npm run build` (tsc) checks it without error.
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { diagnostics: { exclude: ['**/node_modules/**', '**/src/clients/coreClient.ts'] } },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!@mairie360/)'],
  collectCoverage: true,
  // src/index.ts only runs as a real process (tests/startup.test.ts spawns it), out of reach of the
  // in-process coverage: everything it starts (src/app.ts) is measured.
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
  coverageReporters: ['text-summary', 'lcov'],
  coverageThreshold: {
    global: { branches: 60, functions: 60, lines: 60, statements: 60 },
  },
};
