module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
        module: 'commonjs',
        esModuleInterop: true,
        jsx: 'react-jsx',
        moduleResolution: 'node',
        target: 'es2020',
        lib: ['es2020'],
        types: ['jest'],
        skipLibCheck: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__tests__/__mocks__/react-native.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__tests__/__mocks__/async-storage.ts',
  },
};
