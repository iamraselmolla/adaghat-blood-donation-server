import bcrypt from "bcryptjs";

import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";
import { User, Role } from "../models/user.model";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { toAuthUser } from "../utils/serializers";

export const login = catchAsync(async (req, res) => {
  const { identifier, password } = req.body as { identifier: string; password: string };

  const user = await User.findOne({ identifier: identifier.toLowerCase() }).select("+passwordHash");
  if (!user) throw ApiError.unauthorized("Invalid credentials");

  if (user.status !== "ACTIVE") throw ApiError.forbidden("This account has been disabled");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized("Invalid credentials");

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), tokenVersion: user.tokenVersion });

  res.status(200).json({
    accessToken,
    refreshToken,
    user: toAuthUser(user),
  });
});

/**
 * Dual-purpose endpoint:
 *  - Called with no/invalid auth token -> public self-registration. Role is
 *    forced to MEMBER regardless of what the body requests.
 *  - Called by an authenticated SUPER_ADMIN -> staff creation. Whatever role
 *    is supplied in the body (ADMIN or MEMBER) is honored.
 *  - Called by an authenticated ADMIN/MEMBER -> forbidden; only SUPER_ADMIN
 *    can create staff accounts once authenticated.
 */
export const registerStaff = catchAsync(async (req, res) => {
  const { name, identifier, password } = req.body as {
    name: string;
    identifier: string;
    password: string;
    role?: Role;
  };
  let role: Role = "MEMBER";

  if (req.user) {
    if (req.user.role !== "SUPER_ADMIN") {
      throw ApiError.forbidden("Only a super admin can register staff accounts");
    }
    const requestedRole = req.body.role as Role | undefined;
    if (requestedRole && requestedRole !== "SUPER_ADMIN") {
      role = requestedRole;
    } else if (requestedRole === "SUPER_ADMIN") {
      throw ApiError.forbidden("Cannot create another super admin through this endpoint");
    }
  }

  const existing = await User.findOne({ identifier: identifier.toLowerCase() });
  if (existing) throw ApiError.conflict("An account with this email/phone already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    identifier: identifier.toLowerCase(),
    passwordHash,
    role,
    status: "ACTIVE",
  });

  res.status(201).json(toAuthUser(user));
});

export const me = catchAsync(async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  res.status(200).json(toAuthUser(user));
});

export const logout = catchAsync(async (req, res) => {
  // Bump tokenVersion so every previously issued access/refresh token for
  // this user is invalidated immediately.
  await User.findByIdAndUpdate(req.user!.id, { $inc: { tokenVersion: 1 } });
  res.status(200).json({ message: "Logged out" });
});

/**
 * IMPORTANT: only ever returns { accessToken }. The frontend axios interceptor
 * (lib/axios.ts) reads `data.accessToken` exclusively - returning a rotated
 * refreshToken here would silently break refresh on the client.
 */
export const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  if (user.status !== "ACTIVE") throw ApiError.forbidden("This account has been disabled");
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized("Session has been invalidated, please log in again");
  }

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion });

  res.status(200).json({ accessToken });
});
