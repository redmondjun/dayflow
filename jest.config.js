/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/src/**/*.spec.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  passWithNoTests: true,
};
