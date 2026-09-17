import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/eslint.config.mjs',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/src/coverage/**',
      '**/reports/**',
      '**/.stryker-tmp/**',
      '**/.eslintcache',
      '**/*.log',
      '**/node_modules/**',
      'prisma.config.js',
      'prisma.config.js.map',
      'prisma.config.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-sync': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name=/^(readFileSync|writeFileSync|existsSync|statSync|mkdirSync|readdirSync|unlinkSync|appendFileSync|rmdirSync|rmSync|copyFileSync|chmodSync|chownSync|accessSync|truncateSync|openSync|closeSync|readSync|writeSync|execSync|spawnSync|execFileSync|pbkdf2Sync|scryptSync)$/]',
          message:
            'Synchronous blocking operations (fs.*Sync, child_process.*Sync, crypto.*Sync) block the Node.js Event Loop. Use asynchronous non-blocking APIs or Worker Threads.',
        },
      ],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    files: ['**/*.spec.ts', '**/__tests__/**/*.ts', '**/test/**/*.ts', '**/test-setup.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      'no-sync': 'off',
      'no-restricted-syntax': 'off',
    },
  },
);
