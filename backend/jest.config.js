/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // The project's tsconfig uses NodeNext module resolution; ts-jest emits
        // a benign warning about hybrid module kinds. isolatedModules silences
        // it and speeds up transpilation (type-checking is done by `tsc`).
        isolatedModules: true,
      },
    ],
  },
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  // Don't fail the suite when there are no tests yet (keeps `npm test` green
  // in CI while the test suite is still being built out).
  passWithNoTests: true,
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
};
