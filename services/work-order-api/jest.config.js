/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // One process instead of a worker pool: much lower memory use on 8 GB machines.
  maxWorkers: 1,
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '\\.(spec|e2e-spec)\\.ts$',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  transform: {
    // ts-jest only transpiles (tsconfig has isolatedModules: true); `pnpm typecheck` does type checking.
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    // Test against shared-types source so tests don't require a build first.
    '^@workloop/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/main.ts', '!src/**/*.module.ts'],
};
