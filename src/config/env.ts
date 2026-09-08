import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: optionalNumber("PORT", 5000),
  apiPrefix: process.env.API_PREFIX || "/api/v1",

  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  mongoUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/lifedrop"),

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET", "dev_access_secret_change_me"),
    refreshSecret: required("JWT_REFRESH_SECRET", "dev_refresh_secret_change_me"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  eligibility: {
    minDonationGapDays: optionalNumber("MIN_DONATION_GAP_DAYS", 120),
    minWeightKg: optionalNumber("MIN_WEIGHT_KG", 45),
    minHemoglobinMale: optionalNumber("MIN_HEMOGLOBIN_MALE", 13),
    minHemoglobinFemale: optionalNumber("MIN_HEMOGLOBIN_FEMALE", 12),
    minDonorAge: optionalNumber("MIN_DONOR_AGE", 18),
    maxDonorAge: optionalNumber("MAX_DONOR_AGE", 65),
  },

  seed: {
    name: process.env.SEED_SUPER_ADMIN_NAME || "System Admin",
    identifier: process.env.SEED_SUPER_ADMIN_IDENTIFIER || "admin@lifedrop.app",
    password: process.env.SEED_SUPER_ADMIN_PASSWORD || "ChangeMe123!",
  },
};
