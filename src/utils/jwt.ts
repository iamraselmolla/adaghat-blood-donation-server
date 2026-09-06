import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "../constants/roles";

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  tokenType: "access";
}

export interface RefreshTokenPayload {
  sub: string; // user id
  tokenVersion: number;
  tokenType: "refresh";
}

export function signAccessToken(userId: string, role: Role): string {
  const payload: AccessTokenPayload = { sub: userId, role, tokenType: "access" };
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as SignOptions);
}

export function signRefreshToken(userId: string, tokenVersion: number): string {
  const payload: RefreshTokenPayload = { sub: userId, tokenVersion, tokenType: "refresh" };
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}
