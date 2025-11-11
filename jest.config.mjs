import nextJest from "next/jest";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  preset: "ts-jest",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: {
        jsx: "react",
      },
    }],
  },
  globals: {
    "ts-jest": {
      tsconfig: {
        jsx: "react",
      },
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig);

