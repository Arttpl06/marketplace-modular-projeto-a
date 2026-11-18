export default [{ ignores: ['node_modules/**', 'coverage/**', 'tests/performance/**'] }, {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: {
        process: 'readonly', console: 'readonly', structuredClone: 'readonly', performance: 'readonly',
        setTimeout: 'readonly', URL: 'readonly', Buffer: 'readonly', fetch: 'readonly',
        test: 'readonly', expect: 'readonly', beforeAll: 'readonly', afterAll: 'readonly', beforeEach: 'readonly', afterEach: 'readonly'
    } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_|^(req|res|next)$', caughtErrorsIgnorePattern: '^_' }], 'no-undef': 'error', 'eqeqeq': 'error', 'no-unreachable': 'error', 'no-duplicate-imports': 'error' }
}];
