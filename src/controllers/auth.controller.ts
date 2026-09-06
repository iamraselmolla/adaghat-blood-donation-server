import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { serializeAuthUser } from "../utils/serializers";
import { ROLES, STATUS } from "../constants/roles";
import { LoginInput, RefreshInput, RegisterStaffInput } from "../validators/auth.validator";

/** POST /auth/login — accepts email OR phone as `identifier`. */
export async function login(req: Request<unknown, unknown, LoginInput>, res: Response) {
  const { identifier, password } = req.body;

  const user = await User.findOne({ identifier: identifier.trim().toLowerCase() }).select("+passwordHash");
  if (!user) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  if (user.status === STATUS.DISABLED) {
    throw ApiError.forbidden("This account has been disabled. Contact a Super Admin.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id, user.tokenVersion);

  res.status(200).json({
    accessToken,
    refreshToken,
    user: serializeAuthUser(user),
  });
}

/**
 * POST /auth/register-staff
 *
 * Dual purpose, mirroring the frontend:
 *  - Unauthenticated request (public sign-up form) -> always creates a MEMBER
 *    (read-only viewer) account, regardless of what `role` was sent.
 *  - Authenticated SUPER_ADMIN -> may create ADMIN or MEMBER staff accounts.
 * Any other caller (authenticated but not SUPER_ADMIN) is forbidden.
 */
export async function registerStaff(req: Request<unknown, unknown, RegisterStaffInput>, res: Response) {
  const { name, identifier, password } = req.body;
  let { role } = req.body;

  if (req.user) {
    if (req?.user.role !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden("Only a Super Admin can create staff accounts");
    }
    if (role === ROLES.SUPER_ADMIN) {
      throw ApiError.badRequest("Cannot create another Super Admin account");
    }
  } else {
    // Public self sign-up can only ever create a read-only Member account.
    role = ROLES.MEMBER;
  }

  const existing = await User.findByIdentifier(identifier);
  if (existing) {
    throw ApiError.conflict("An account with this email or phone already exists");
  }

  const user = await User.create({
    name,
    identifier: identifier.trim().toLowerCase(),
    passwordHash: password, // hashed by pre-save hook
    role,
    status: STATUS.ACTIVE,
  });

  res.status(201).json(serializeAuthUser(user));
}

/** GET /auth/me — returns the currently authenticated user. */
export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  res.status(200).json(serializeAuthUser(user));
}

/** POST /auth/refresh — exchanges a valid refresh token for a new access token. */
export async function refresh(req: Request<unknown, unknown, RefreshInput>, res: Response) {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized("Session expired, please sign in again");
    }
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  if (user.status === STATUS.DISABLED) throw ApiError.forbidden("This account has been disabled");
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized("Session has been revoked, please sign in again");
  }

  const accessToken = signAccessToken(user.id, user.role);
  res.status(200).json({ accessToken });
}

/** POST /auth/logout — invalidates all outstanding refresh tokens for this user. */
export async function logout(req: Request, res: Response) {
  if (req.user) {
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
  }
  res.status(200).json({ message: "Logged out" });
}
