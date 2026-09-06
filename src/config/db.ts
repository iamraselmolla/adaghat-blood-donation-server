import mongoose from "mongoose";
import { env } from "../config/env";

mongoose.set("strictQuery", true);

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.mongodbUri);
    }

    isConnected = mongoose.connection.readyState === 1;

   console.log("[DB] Connected successfully");
  console.log("[DB] Database:", mongoose.connection.name);
  console.log("[DB] Host:", mongoose.connection.host);
  } catch (err) {
    isConnected = false;

    console.error(
      "[db] Failed to connect to MongoDB:",
      err instanceof Error ? err.message : err
    );

    // IMPORTANT:
    // Do NOT use process.exit() inside Vercel serverless functions.
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  isConnected = false;
}