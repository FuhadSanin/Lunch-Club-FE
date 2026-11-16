import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// The app's own code. Left out: build output, the promo and art scripts, and src/components/ui, which
// is shadcn/ui as `npx shadcn add` wrote it.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'promo', 'scripts', 'public', 'src/components/ui'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
