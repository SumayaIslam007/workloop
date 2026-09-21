// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Uses the non-type-aware rule sets on purpose: type-aware linting loads a second full
// TypeScript program, which is slow on low-RAM machines. `pnpm typecheck` (tsc, strict)
// already catches type errors. See docs/adr/0006.
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/src/generated/**',
      '**/*.config.{js,cjs,mjs}',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // NestJS modules are empty classes by design: the @Module() decorator carries the metadata.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    // NestJS dependency injection reads constructor parameter types at runtime
    // (emitDecoratorMetadata). Telling the parser lets consistent-type-imports skip
    // decorated files instead of turning injected classes into type-only imports.
    files: ['services/work-order-api/**/*.ts'],
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
);
