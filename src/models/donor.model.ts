import { Schema, model, Document, Types } from "mongoose";

import { BloodGroup } from "./shared.types";

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type EligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "PENDING_REVIEW";

export interface IAddress {
  division: string;
  district: string;
  upazila: string;
  addressLine?: string;
  coordinates?: { lat: number; lng: number };
}

export interface IMedicalConditions {
  diabetes: boolean;
  hepatitis: boolean;
  hiv: boolean;
  heartDisease: boolean;
  recentSurgery: boolean;
  recentTattoo: boolean;
}

export interface IMedicalRecord {
  weightKg: number;
  bloodPressure: string;
  hemoglobin: number;
  conditions: IMedicalConditions;
  currentMedications?: string;
  eligibilityStatus: EligibilityStatus;
  updatedBy?: Types.ObjectId;
  updatedAt?: Date;
}

export interface IDonor extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  bloodGroup: BloodGroup;
  gender: Gender;
  dob: Date;
  address: IAddress;
  lastDonationDate?: Date | null;
  availability: boolean;
  medicalRecord?: IMedicalRecord;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    division: { type: String, required: true },
    district: { type: String, required: true },
    upazila: { type: String, required: true },
    addressLine: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { _id: false }
);

const medicalConditionsSchema = new Schema<IMedicalConditions>(
  {
    diabetes: { type: Boolean, default: false },
    hepatitis: { type: Boolean, default: false },
    hiv: { type: Boolean, default: false },
    heartDisease: { type: Boolean, default: false },
    recentSurgery: { type: Boolean, default: false },
    recentTattoo: { type: Boolean, default: false },
  },
  { _id: false }
);

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    weightKg: { type: Number, required: true },
    bloodPressure: { type: String, required: true },
    hemoglobin: { type: Number, required: true },
    conditions: { type: medicalConditionsSchema, required: true, default: () => ({}) },
    currentMedications: { type: String },
    eligibilityStatus: {
      type: String,
      enum: ["ELIGIBLE", "INELIGIBLE", "PENDING_REVIEW"],
      default: "PENDING_REVIEW",
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const donorSchema = new Schema<IDonor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], required: true },
    dob: { type: Date, required: true },
    address: { type: addressSchema, required: true },
    lastDonationDate: { type: Date, default: null },
    availability: { type: Boolean, default: true },
    medicalRecord: { type: medicalRecordSchema },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

donorSchema.index({ name: "text", phone: "text", email: "text" });
donorSchema.index({ bloodGroup: 1 });
donorSchema.index({ "address.division": 1, "address.district": 1, "address.upazila": 1 });

export const Donor = model<IDonor>("Donor", donorSchema);
