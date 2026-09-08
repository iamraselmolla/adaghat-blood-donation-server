import mongoose from "mongoose";

import { env } from "../config/env";

// In serverless environments (e.g. Vercel) each invocation can reuse the same
// Node.js process, so we cache the connection on the global object to avoid
// exhausting MongoDB's connection limit by reconnecting on every request.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __lifedropMongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__lifedropMongooseCache ?? { conn: null, promise: null };
global.__lifedropMongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(env.mongoUri).then((m) => m);
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}
