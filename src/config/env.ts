import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === "") {
    // Fail fast on boot rather than crashing deep inside a request handler.
    // eslint-disable-next-line no-console
    console.error(`[env] Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT ?? "5000", 10),
  apiPrefix: process.env.API_PREFIX ?? "/api/v1",


  mongodbUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/lifedrop"),

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET", "dev_access_secret_change_me"),
    refreshSecret: required("JWT_REFRESH_SECRET", "dev_refresh_secret_change_me"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? "300", 10),
  },

  seed: {
    name: process.env.SEED_SUPER_ADMIN_NAME ?? "System Owner",
    identifier: process.env.SEED_SUPER_ADMIN_IDENTIFIER ?? "superadmin@lifedrop.app",
    password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!",
  },
};
