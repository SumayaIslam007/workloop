/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // One process instead of a worker pool: much lower memory use on 8 GB machines.
  maxWorkers: 1,
  // ts-jest only transpiles (tsconfig has isolatedModules: true); `pnpm typecheck` does type checking.
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageThreshold: {
    './src/work-order/state-machine.ts': { branches: 100, functions: 100, lines: 100 },
  },
};
