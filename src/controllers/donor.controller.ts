import { Types, PipelineStage } from "mongoose";
import bcrypt from "bcryptjs";

import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";
import { Donor } from "../models/Donor.model";
import { User } from "../models/User.model";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination";
import { computeEligibilityStatus } from "../utils/eligibility";
import { env } from "../config/env";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const listDonors = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const { search, bloodGroup, division, district, upazila, availability, eligibility } = req.query as Record<
    string,
    string | undefined
  >;

  const match: Record<string, unknown> = {};

  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    match.$or = [{ name: re }, { phone: re }, { email: re }];
  }
  if (bloodGroup && bloodGroup !== "ALL") match.bloodGroup = bloodGroup;
  if (division) match["address.division"] = division;
  if (district) match["address.district"] = district;
  if (upazila) match["address.upazila"] = upazila;
  if (availability === "AVAILABLE") match.availability = true;
  if (availability === "UNAVAILABLE") match.availability = false;

  const pipeline: PipelineStage[] = [{ $match: match }];

  // Computed, point-in-time eligibility: combines the medical eligibilityStatus
  // with the date-based donation cooldown, since neither alone is stored as a
  // single persisted field (the cooldown is relative to "now").
  pipeline.push({
    $addFields: {
      __dateEligible: {
        $or: [
          { $not: ["$lastDonationDate"] },
          {
            $gte: [
              { $divide: [{ $subtract: ["$$NOW", "$lastDonationDate"] }, 1000 * 60 * 60 * 24] },
              env.eligibility.minDonationGapDays,
            ],
          },
        ],
      },
    },
  });
  pipeline.push({
    $addFields: {
      __eligibleNow: {
        $and: [{ $eq: ["$medicalRecord.eligibilityStatus", "ELIGIBLE"] }, "$__dateEligible"],
      },
    },
  });

  if (eligibility === "ELIGIBLE") pipeline.push({ $match: { __eligibleNow: true } });
  if (eligibility === "INELIGIBLE") pipeline.push({ $match: { __eligibleNow: false } });

  pipeline.push({ $project: { __dateEligible: 0, __eligibleNow: 0 } });
  pipeline.push({ $sort: { createdAt: -1 } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      totalCount: [{ $count: "count" }],
    },
  });

  const [result] = await Donor.aggregate(pipeline);
  const data = result?.data ?? [];
  const total = result?.totalCount?.[0]?.count ?? 0;

  res.status(200).json(buildPaginatedResponse(data, total, page, limit));
});

export const getDonorById = catchAsync(async (req, res) => {
  const donor = await Donor.findById(req.params.id);
  if (!donor) throw ApiError.notFound("Donor not found");
  res.status(200).json(donor);
});

export const createDonor = catchAsync(async (req, res) => {
  const { password, ...rest } = req.body as Record<string, unknown> & { password?: string };

  let userId: Types.ObjectId | undefined;
  if (password && rest.email) {
    const identifier = String(rest.email).toLowerCase();
    const existingUser = await User.findOne({ identifier });
    if (!existingUser) {
      const passwordHash = await bcrypt.hash(password, 10);
      const donorAccount = await User.create({
        name: rest.name,
        identifier,
        passwordHash,
        role: "MEMBER",
        status: "ACTIVE",
      });
      userId = donorAccount._id;
    } else {
      userId = existingUser._id;
    }
  }

  const donor = await Donor.create({
    ...rest,
    email: rest.email || undefined,
    lastDonationDate: rest.lastDonationDate || null,
    userId,
  });

  res.status(201).json(donor);
});

export const updateDonor = catchAsync(async (req, res) => {
  const updates = { ...(req.body as Record<string, unknown>) };
  delete updates.password;
  if ("email" in updates && !updates.email) updates.email = undefined;
  if ("lastDonationDate" in updates && !updates.lastDonationDate) updates.lastDonationDate = null;

  const donor = await Donor.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!donor) throw ApiError.notFound("Donor not found");

  res.status(200).json(donor);
});

export const deleteDonor = catchAsync(async (req, res) => {
  const donor = await Donor.findByIdAndDelete(req.params.id);
  if (!donor) throw ApiError.notFound("Donor not found");
  res.status(204).send();
});

export const updateMedicalRecord = catchAsync(async (req, res) => {
  const { weightKg, bloodPressure, hemoglobin, conditions, currentMedications } = req.body as {
    weightKg: number;
    bloodPressure: string;
    hemoglobin: number;
    conditions: Record<string, boolean>;
    currentMedications?: string;
  };

  const donor = await Donor.findById(req.params.id);
  if (!donor) throw ApiError.notFound("Donor not found");

  const eligibilityStatus = computeEligibilityStatus({
    gender: donor.gender,
    dob: donor.dob,
    weightKg,
    hemoglobin,
    conditions: conditions as never,
  });

  donor.medicalRecord = {
    weightKg,
    bloodPressure,
    hemoglobin,
    conditions: conditions as never,
    currentMedications,
    eligibilityStatus,
    updatedBy: new Types.ObjectId(req.user!.id),
    updatedAt: new Date(),
  };

  await donor.save();

  res.status(200).json(donor.medicalRecord);
});
