const transformIgnorePatterns = ['node_modules/(?!(uuid)/)'];

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  coverageDirectory: './coverage/',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/**/stories/*'],
  roots: ['<rootDir>/src/'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
  },
  transformIgnorePatterns,
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.js'],
  transform: {
    // Setup file: use SWC without plugin (plugin fails on plain .js)
    'jest\\.setup\\.js$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'ecmascript' },
        },
      },
    ],
    // SWC without jest_workaround plugin (plugin can fail to invoke on some systems)
    '^.+\\.(ts|js)x?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            jsx: true,
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },
};

