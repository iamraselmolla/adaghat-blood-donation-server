import mongoose from "mongoose";
import { env } from "@/config/env";

mongoose.set("strictQuery", true);

export async function connectDB(): Promise<void> {
  try {
    mongoose.connection.on("connected", () => {
      // eslint-disable-next-line no-console
      console.log(`[db] MongoDB connected -> ${mongoose.connection.name}`);
    });

    mongoose.connection.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("[db] MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      // eslint-disable-next-line no-console
      console.warn("[db] MongoDB disconnected");
    });

    await mongoose.connect(env.mongodbUri);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[db] Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
