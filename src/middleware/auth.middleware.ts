import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import { catchAsync } from "../utils/catchAsync";
import { User } from "../models/User.model";
import { Role } from "../models/User.model";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

async function loadUserFromToken(token: string) {
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);

  if (!user) throw ApiError.unauthorized("Account no longer exists");
  if (user.status !== "ACTIVE") throw ApiError.forbidden("This account has been disabled");
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized("Session has been invalidated, please log in again");
  }

  return {
    id: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion,
    name: user.name,
    identifier: user.identifier,
    status: user.status,
  };
}

/** Requires a valid, non-expired access token. */
export const protect = catchAsync(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized("Authentication required");

  try {
    req.user = await loadUserFromToken(token);
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized("Access token expired"));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(ApiError.unauthorized("Invalid access token"));
    }
    next(err);
  }
});

/**
 * Parses the access token if present, but never rejects the request when it's
 * missing or invalid. Used by POST /auth/register-staff, whose behavior
 * changes based on whether the caller is an authenticated SUPER_ADMIN.
 */
export const optionalAuth = catchAsync(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    req.user = await loadUserFromToken(token);
  } catch {
    // Invalid/expired token on an optional-auth route: treat as anonymous.
  }
  next();
});

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
