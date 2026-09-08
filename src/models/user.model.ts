import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export type Role = "SUPER_ADMIN" | "ADMIN" | "MEMBER";
export type UserStatus = "ACTIVE" | "DISABLED";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  identifier: string; // email or phone, unique login handle
  passwordHash: string;
  role: Role;
  status: UserStatus;
  avatarUrl?: string;
  tokenVersion: number; // bumped to invalidate all previously issued tokens
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    identifier: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["SUPER_ADMIN", "ADMIN", "MEMBER"], default: "MEMBER" },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE" },
    avatarUrl: { type: String },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<IUser>("User", userSchema);
