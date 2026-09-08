import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

interface ErrorBody {
  message: string;
  statusCode: number;
  errors?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const body = normalizeError(err);

  if (!env?.nodeEnv && body.statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(body.statusCode).json(body);
}

function normalizeError(err: unknown): ErrorBody {
  if (err instanceof ApiError) {
    return { message: err.message, statusCode: err.statusCode, errors: err.errors };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors: Record<string, string> = {};
    for (const [field, validatorError] of Object.entries(err.errors)) {
      errors[field] = validatorError.message;
    }
    return { message: "Validation failed", statusCode: 400, errors };
  }

  if (err instanceof mongoose.Error.CastError) {
    return { message: `Invalid value for '${err.path}'`, statusCode: 400 };
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern ?? { field: 1 })[0] ?? "field";
    return { message: `A record with this ${field} already exists`, statusCode: 409, errors: { [field]: "Already in use" } };
  }

  if (err instanceof Error) {
    return { message: err.message || "Internal server error", statusCode: 500 };
  }

  return { message: "Internal server error", statusCode: 500 };
}

function isDuplicateKeyError(err: unknown): err is { code: number; keyPattern?: Record<string, number> } {
  return typeof err === "object" && err !== null && (err as any).code === 11000;
}
