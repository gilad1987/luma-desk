import type { Linter } from 'eslint';

/**
 * The code rules adopted from budget-app (docs/rules/code.md).
 */
export const codeRules: Linter.Config[] = [
  {
    files: ['**/*.ts'],
    rules: {
      // `_` marks a parameter a callback signature forces on us, for example an EventBus handler that ignores its payload
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: false }],
      '@typescript-eslint/no-extraneous-class': 'error',
      // more go into a readonly options object; per-frame code that must not allocate disables it with the reason
      '@typescript-eslint/max-params': ['error', { max: 4 }],
      'max-depth': ['error', 3],
      'no-nested-ternary': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    // test helpers are not a module boundary: a world or snapshot builder's return type is its body
    files: ['**/*.ts'],
    ignores: ['tests/**'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
  },
  {
    // the app and the worker report through the EventBus `message` event, not the console; scripts/ and tests/ may print
    files: ['src/**/*.ts', 'sw.ts'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // app code only: a test's describe callback holds its cases and grows with them
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // rig areas are data: one builder call per fixture row in the original order, which a split would only scatter
    files: ['src/domain/rig/*.ts'],
    ignores: ['src/domain/rig/index.ts', 'src/domain/rig/Rig.ts', 'src/domain/rig/RigBuilder.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    // oracles are the original desk code copied as is: the copy is the reference the parity tests compare against
    files: ['tests/**/oracle/**/*.ts'],
    rules: { 'no-nested-ternary': 'off', 'max-depth': 'off', '@typescript-eslint/max-params': 'off' },
  },
];
