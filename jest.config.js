const nextJest = require("next/jest.js");

const createJestConfig = nextJest({
    // Provides the path to your Next.js app to load next.config and .env files
    dir: "./",
});

/** @type {import('jest').Config} */
const config = {
    testEnvironment: "jest-environment-jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    moduleNameMapper: {
        // Tells Jest how to resolve your absolute imports like '@/lib/db'
        "^@/(.*)$": "<rootDir>/src/$1",

        // The Magic Fix: Force Jest to use the CommonJS version of bson
        "^bson$": require.resolve("bson"),
    },
};

module.exports = createJestConfig(config);
