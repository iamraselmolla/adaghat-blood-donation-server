import { Schema, model, Document, Model, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { ALL_ROLES, ROLES, Role, STATUS, Status } from "../constants/roles";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  identifier: string; // email or phone, always stored lowercase/trimmed
  passwordHash: string;
  role: Role;
  status: Status;
  avatarUrl?: string;
  tokenVersion: number; // bumped on logout/password change to invalidate old refresh tokens
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  findByIdentifier(identifier: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ALL_ROLES, default: ROLES.MEMBER, required: true },
    status: { type: String, enum: [STATUS.ACTIVE, STATUS.DISABLED], default: STATUS.ACTIVE },
    avatarUrl: { type: String },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("passwordHash") && this.passwordHash && !this.passwordHash.startsWith("$2")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.trim().toLowerCase() });
};

// Defense in depth: even if a raw document is ever serialized directly
// (instead of going through an explicit DTO/serializer), never leak
// sensitive fields. Controllers build the exact response shapes the
// frontend expects (AuthUser uses `id`, StaffMember uses `_id`).
userSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.tokenVersion;
    return ret;
  },
});

export const User = model<IUser, IUserModel>("User", userSchema);
