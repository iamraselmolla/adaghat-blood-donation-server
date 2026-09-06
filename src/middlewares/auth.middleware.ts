import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "@/utils/ApiError";
import { verifyAccessToken } from "@/utils/jwt";
import { User } from "@/models/user.model";
import { STATUS } from "@/constants/roles";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

/** Requires a valid access token. Rejects with 401 if missing/invalid/expired. */
export async function protect(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw ApiError.unauthorized("Authentication required");
    }

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);
    if (!user) {
      throw ApiError.unauthorized("Account no longer exists");
    }
    if (user.status === STATUS.DISABLED) {
      throw ApiError.forbidden("This account has been disabled");
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    if (err instanceof jwt.TokenExpiredError) return next(ApiError.unauthorized("Access token expired"));
    if (err instanceof jwt.JsonWebTokenError) return next(ApiError.unauthorized("Invalid access token"));
    next(err);
  }
}

/** Attaches req.user when a valid token is present, but never rejects the request. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) return next();

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user && user.status !== STATUS.DISABLED) {
      req.user = { id: user.id, role: user.role };
    }
    next();
  } catch {
    // Invalid/expired token on an optional route: proceed unauthenticated.
    next();
  }
}
