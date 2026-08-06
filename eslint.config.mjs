import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/node_modules/**', '**/*.config.cjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/*.mjs', 'infrastructure/docker/mocks/*.mjs'],
    languageOptions: {
      globals: {
        AbortSignal: 'readonly',
        URL: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: { '@typescript-eslint/consistent-type-imports': 'error' }
  }
);
