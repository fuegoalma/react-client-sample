import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'node_modules',
      // Generated from the vendored OpenAPI document by `make sync-spec`; its
      // style is openapi-typescript's business, not ours.
      'tests/contract/schema.d.ts',
    ],
  },

  js.configs.recommended,

  {
    // Type-aware linting only where there are types: `public/env.js` is a
    // runtime artifact outside the TypeScript program.
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        // The root tsconfig is a solution file with no files of its own, so the
        // project service would fall back to an inferred project — losing the
        // path aliases and reporting every aliased import as an error type.
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Strict typing — requirement #10.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],

      // Bracket access on a type whose keys are an index signature is not a
      // stylistic slip — it is how a dynamic key reads.
      '@typescript-eslint/dot-notation': ['error', { allowIndexSignaturePropertyAccess: true }],
    },
  },

  {
    // RTK Query spells "this endpoint takes no argument" as a `void` type
    // argument — `build.query<Me, void>` — which is what lets `useMeQuery()` be
    // called with none. The rule has no option for a call's type arguments.
    files: ['src/repositories/**/*.ts'],
    rules: { '@typescript-eslint/no-invalid-void-type': 'off' },
  },

  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  {
    files: ['**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  prettier,
)
