import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'referencias', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // La logica de negocio es pura: sin React y sin Supabase (CLAUDE.md, plan §2.4).
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/domain es TypeScript puro: sin React (plan §2.4).' },
            { name: 'react-dom', message: 'src/domain es TypeScript puro: sin React (plan §2.4).' },
            {
              name: '@supabase/supabase-js',
              message: 'src/domain no habla con Supabase. Eso vive en src/data (CLAUDE.md).',
            },
          ],
          patterns: [
            { group: ['@/data/*', '@/features/*', '@/ui/*', '@/app/*'], message: 'src/domain no depende de capas superiores.' },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.ts', 'api/**/*.ts', 'vite.config.ts', 'playwright.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
