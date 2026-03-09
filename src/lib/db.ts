import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI || MONGODB_URI.trim() === "") {
    throw new Error("Please define the MONGODB_URI environment variable");
}

let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        // cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
        //     return mongoose;
        // });

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("Successfully connected to MongoDB.");
            return mongoose;
        });
    }
    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null; 
        console.error("Error connecting to MongoDB:", error);
        throw new Error("Failed to connect to MongoDB.");
    }
    return cached.conn;
}

export default connectDB;
