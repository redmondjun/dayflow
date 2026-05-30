const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  {
    rules: {
      'import/order': 'off',
    },
  },
  eslintConfigPrettier,
]);
