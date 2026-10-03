/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    'src/domain/**/*.{ts,tsx}',
    'src/data/**/*.{ts,tsx}',
    'src/platform/**/*.{ts,tsx}',
    'src/features/permissions/PermissionsController.ts',
    'src/features/rules/**/*.{ts,tsx}',
    '!src/features/rules/defaultRepositories.ts',
    '!src/features/rules/useRules.ts',
    '!src/**/index.ts',
    '!src/**/interface.ts',
    '!src/**/interfaces.ts',
    '!src/**/types.ts',
    '!src/**/*.d.ts',
  ],
};
