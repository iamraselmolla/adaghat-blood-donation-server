import { IUser } from "../models/user.model";

export interface AuthUserDTO {
  id: string;
  name: string;
  identifier: string;
  role: string;
  status: string;
  avatarUrl?: string;
}

export interface StaffMemberDTO {
  _id: string;
  name: string;
  identifier: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

/** Matches the frontend's `AuthUser` type (uses `id`, returned by /auth/*). */
export function toAuthUser(user: IUser): AuthUserDTO {
  return {
    id: user._id.toString(),
    name: user.name,
    identifier: user.identifier,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
  };
}

/** Matches the frontend's `StaffMember` type (uses `_id`, returned by /admin/staff). */
export function toStaffMember(user: IUser): StaffMemberDTO {
  return {
    _id: user._id.toString(),
    name: user.name,
    identifier: user.identifier,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : undefined,
  };
}
