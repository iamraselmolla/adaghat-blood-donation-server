import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = "Something went wrong";
  let errors: Record<string, string> | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.fromEntries(
      Object.entries(err.errors).map(([key, value]) => [key, value.message])
    );
  } else if (typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000) {
    statusCode = 409;
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : "field";
    message = `A record with this ${field} already exists`;
  } else if (err instanceof Error) {
    message = env.nodeEnv === "production" ? message : err.message;
  }

  if (env.nodeEnv !== "production" && statusCode === 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    statusCode,
    ...(errors ? { errors } : {}),
  });
}
