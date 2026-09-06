import { Schema, model, Document, Types } from "mongoose";
import { ELIGIBILITY, EligibilityStatus } from "../constants/roles";

export interface IMedicalConditions {
  diabetes: boolean;
  hepatitis: boolean;
  hiv: boolean;
  heartDisease: boolean;
  recentSurgery: boolean;
  recentTattoo: boolean;
}

export interface IMedicalRecord extends Document {
  _id: Types.ObjectId;
  donorId: Types.ObjectId;
  weightKg: number;
  bloodPressure: string;
  hemoglobin: number;
  conditions: IMedicalConditions;
  currentMedications?: string;
  eligibilityStatus: EligibilityStatus;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conditionsSchema = new Schema<IMedicalConditions>(
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
    donorId: { type: Schema.Types.ObjectId, ref: "Donor", required: true, unique: true, index: true },
    weightKg: { type: Number, required: true, min: 0, max: 300 },
    bloodPressure: {
      type: String,
      required: true,
      match: [/^\d{2,3}\/\d{2,3}$/, "Blood pressure must be in the format systolic/diastolic, e.g. 120/80"],
    },
    hemoglobin: { type: Number, required: true, min: 0, max: 30 },
    conditions: { type: conditionsSchema, default: () => ({}) },
    currentMedications: { type: String, trim: true, maxlength: 500 },
    eligibilityStatus: {
      type: String,
      enum: [ELIGIBILITY.ELIGIBLE, ELIGIBILITY.INELIGIBLE, ELIGIBILITY.PENDING_REVIEW],
      default: ELIGIBILITY.PENDING_REVIEW,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

medicalRecordSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.__v;
    return ret;
  },
});

export const MedicalRecord = model<IMedicalRecord>("MedicalRecord", medicalRecordSchema);
