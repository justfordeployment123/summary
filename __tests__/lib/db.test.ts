// __tests__/lib/db.test.ts

import { MongoMemoryServer } from "mongodb-memory-server";

// 1. Tell Mongoose to suppress the JSDOM warnings
process.env.SUPPRESS_JEST_WARNINGS = "true";

describe("Database Connection Utility (db.ts)", () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
    });

    afterAll(async () => {
        // 2. dynamically require mongoose here to close the active connections
        // This fixes the "Open Handles" warning
        const mongoose = require("mongoose");
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(() => {
        jest.resetModules();
        delete (global as any).mongoose;
        jest.restoreAllMocks();
    });

    it("should throw an error if MONGODB_URI is missing", () => {
        delete process.env.MONGODB_URI;
        expect(() => {
            require("../../src/lib/db");
        }).toThrow("Please define the MONGODB_URI environment variable");
    });

    it("should successfully connect to MongoDB using a valid URI", async () => {
        process.env.MONGODB_URI = mongoServer.getUri();
        const connectDB = require("../../src/lib/db").default;
        const mongooseInstance = await connectDB();
        expect(mongooseInstance.connection.readyState).toBe(1);
    });

    it("should cache the connection and not call mongoose.connect twice", async () => {
        process.env.MONGODB_URI = mongoServer.getUri();

        // 3. The Fix: Require mongoose dynamically AFTER resetting modules
        // so we spy on the exact same instance that db.ts is using
        const mongoose = require("mongoose");
        const connectSpy = jest.spyOn(mongoose, "connect");

        const connectDB = require("../../src/lib/db").default;

        const conn1 = await connectDB();
        const conn2 = await connectDB();

        expect(conn1).toBe(conn2);
        expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle connection errors gracefully", async () => {
        // 1. Mute console.error temporarily so it doesn't litter the terminal
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // 2. Trigger the intentional failure
        process.env.MONGODB_URI = "mongodb://127.0.0.1:54321/non_existent_db?serverSelectionTimeoutMS=100";
        const connectDB = require("../../src/lib/db").default;

        await expect(connectDB()).rejects.toThrow("Failed to connect to MongoDB.");
        expect((global as any).mongoose.promise).toBeNull();

        // 3. Turn console.error back on so we don't hide real bugs in other tests
        consoleSpy.mockRestore();
    });
});
