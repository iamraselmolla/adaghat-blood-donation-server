import { Schema, model, Document, Types } from "mongoose";

import { BloodGroup } from "./shared.types";

export interface IDonation extends Document {
  _id: Types.ObjectId;
  donorId: Types.ObjectId;
  donorName: string; // snapshot at time of donation
  donorBloodGroup: BloodGroup; // snapshot at time of donation
  donationDate: Date;
  location: string;
  recipientName: string;
  requestedByName?: string;
  requestedByPhone?: string;
  notes?: string;
  recordedBy: Types.ObjectId;
  recordedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const donationSchema = new Schema<IDonation>(
  {
    donorId: { type: Schema.Types.ObjectId, ref: "Donor", required: true, index: true },
    donorName: { type: String, required: true },
    donorBloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    donationDate: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    recipientName: { type: String, required: true, trim: true },
    requestedByName: { type: String, trim: true },
    requestedByPhone: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recordedByName: { type: String, required: true },
  },
  { timestamps: true }
);

donationSchema.index({ donationDate: -1 });
donationSchema.index({ donorName: "text", recipientName: "text", location: "text" });

export const Donation = model<IDonation>("Donation", donationSchema);
