const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Domain layer must be pure TypeScript. No React imports allowed.',
            },
            {
              name: 'react-native',
              message: 'Domain layer must be pure TypeScript. No React Native imports allowed.',
            },
            {
              name: 'expo',
              message: 'Domain layer must be pure TypeScript. No Expo imports allowed.',
            },
            {
              name: 'expo-router',
              message: 'Domain layer must be pure TypeScript. No Expo Router imports allowed.',
            },
          ],
          patterns: [
            {
              group: ['expo-*', '@expo/*'],
              message: 'Domain layer must be pure TypeScript. No Expo module imports allowed.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'targets/**', 'scratch/**', 'android/**', 'ios/**'],
  },
];
