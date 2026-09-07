import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { BLOOD_GROUPS, BloodGroup, GENDERS, Gender } from "../constants/roles";

export interface IAddress {
  division: string;
  district: string;
  upazila: string;
  addressLine?: string;
}

export interface IDonor extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  passwordHash?: string;
  bloodGroup: BloodGroup;
  gender: Gender;
  dob: Date;
  address: IAddress;
  location?: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  lastDonationDate?: Date | null;
  availability: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  hasPassword(): boolean;
  comparePassword(candidate: string): Promise<boolean>;
}

const addressSchema = new Schema<IAddress>(
  {
    division: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    upazila: { type: String, required: true, trim: true },
    addressLine: { type: String, trim: true },
  },
  { _id: false }
);

const donorSchema = new Schema<IDonor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, select: false },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    gender: { type: String, enum: GENDERS, required: true },
    dob: { type: Date, required: true },
    address: { type: addressSchema, required: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
      _id: false,
      default: undefined, // prevents Mongoose from auto-materializing this subdocument as {}
    },
    lastDonationDate: { type: Date, default: null },
    availability: { type: Boolean, default: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

donorSchema.index({ "address.division": 1, "address.district": 1, "address.upazila": 1 });
donorSchema.index({ bloodGroup: 1 });
donorSchema.index({ name: "text", phone: "text", email: "text" });
donorSchema.index({ location: "2dsphere" });

// Self-heals any partially-built location object (e.g. { type: "Point" } with no
// coordinates) before it can reach the 2dsphere index and throw.
donorSchema.pre("validate", function (next) {
  if (this.location && (!this.location.coordinates || this.location.coordinates.length !== 2)) {
    this.location = undefined;
  }
  next();
});

donorSchema.pre("save", async function (next) {
  if (this.isModified("passwordHash") && this.passwordHash && !this.passwordHash.startsWith("$2")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

donorSchema.methods.hasPassword = function (): boolean {
  return !!this.passwordHash;
};

donorSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

// Virtual, populate-able one-to-one link to the donor's medical record.
donorSchema.virtual("medicalRecord", {
  ref: "MedicalRecord",
  localField: "_id",
  foreignField: "donorId",
  justOne: true,
});

donorSchema.set("toObject", { virtuals: true });
donorSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.__v;
    delete ret.passwordHash;

    if (ret.location?.coordinates?.length === 2) {
      ret.address = {
        ...ret.address,
        coordinates: { lng: ret.location.coordinates[0], lat: ret.location.coordinates[1] },
      };
    }
    delete ret.location;

    return ret;
  },
});

export const Donor = model<IDonor>("Donor", donorSchema);