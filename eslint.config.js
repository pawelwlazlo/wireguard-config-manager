import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

// Bazowa konfiguracja TypeScript z regułami recommended
const baseConfig = tseslint.config({
  extends: [tseslint.configs.recommended],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
});

// Konfiguracja dla plików TypeScript i JavaScript
const tsConfig = tseslint.config({
  files: ['**/*.{js,jsx,ts,tsx}'],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: './tsconfig.json',
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
});

// Konfiguracja dla plików React (.tsx, .jsx)
const reactConfig = tseslint.config({
  files: ['**/*.{tsx,jsx}'],
  rules: {
    // React 17+ nie wymaga importu React w każdym pliku
    'react/react-in-jsx-scope': 'off',
  },
});

// Eksportujemy finalną konfigurację używając tseslint.config()
// Konfiguracja Astro musi być na końcu, aby poprawnie parsować pliki .astro
export default tseslint.config(
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },
  baseConfig,
  tsConfig,
  reactConfig,
  // Konfiguracja Astro - flat/recommended zawiera parser i reguły dla plików .astro
  ...eslintPluginAstro.configs['flat/recommended']
);
