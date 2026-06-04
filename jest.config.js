module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|chess\\.js))',
  ],
  collectCoverageFrom: [
    'src/engine/**/*.ts',
    'src/engine/**/*.tsx',
    '!src/engine/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
  },
};
