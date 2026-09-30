const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // Files that must not be parsed.
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'cicd-repo/',
      'eslint.config.cjs',
      'jest.config.ts',
      'scripts/export-swagger.ts',
      'load-test.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'], // Type-aware rules on the TypeScript sources only.
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
