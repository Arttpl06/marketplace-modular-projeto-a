export default{
    testEnvironment: 'node',
    transform: {},
    testMatch: ['**/tests/unit/**/*.test.js','**/tests/integration/**/*.test.js','**/tests/contract/**/*.test.js'],
    globalSetup: './tests/global-setup.js',
    setupFilesAfterEnv: ['./tests/setup.js'],
    testTimeout: 15000,
    collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/worker.js', '!src/config/**'],
    coverageReporters: ['text', 'lcov', 'json-summary'],
    coverageThreshold: { global: { statements: 80, lines: 80, functions: 80, branches: 70 } }
};
