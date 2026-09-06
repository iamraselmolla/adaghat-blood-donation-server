import { Request, Response } from "express";
import mongoose from "mongoose";
import { Donor } from "../models/donor.model";
import { MedicalRecord } from "../models/medicalRecord.model";
import { ApiError } from "../utils/ApiError";
import { serializeDonor, serializeMedicalRecord } from "../utils/serializers";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination";
import { computeEligibility } from "../utils/eligibility";
import {
  CreateDonorInput,
  ListDonorsQuery,
  MedicalRecordInput,
  UpdateDonorInput,
} from "../validators/donor.validator";

/** GET /donors — paginated, filterable by blood group, location, availability, and eligibility. */
export async function listDonors(req: Request<unknown, unknown, unknown, ListDonorsQuery>, res: Response) {
  const filters = req.query;
  const { page, limit, skip } = parsePagination(filters as unknown as Record<string, unknown>);

  const match: Record<string, unknown> = {};

  if (filters.search) {
    const term = escapeRegex(filters.search.trim());
    const re = new RegExp(term, "i");
    match.$or = [{ name: re }, { phone: re }, { email: re }];
  }
  if (filters.bloodGroup && filters.bloodGroup !== "ALL") {
    match.bloodGroup = filters.bloodGroup;
  }
  if (filters.division) match["address.division"] = filters.division;
  if (filters.district) match["address.district"] = filters.district;
  if (filters.upazila) match["address.upazila"] = filters.upazila;
  if (filters.availability === "AVAILABLE") match.availability = true;
  if (filters.availability === "UNAVAILABLE") match.availability = false;

  const pipeline: mongoose.PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: MedicalRecord.collection.name,
        localField: "_id",
        foreignField: "donorId",
        as: "medicalRecord",
      },
    },
    { $unwind: { path: "$medicalRecord", preserveNullAndEmptyArrays: true } },
  ];

  if (filters.eligibility && filters.eligibility !== "ALL") {
    pipeline.push({ $match: { "medicalRecord.eligibilityStatus": filters.eligibility } });
  }

  pipeline.push({
    $facet: {
      data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
      totalCount: [{ $count: "count" }],
    },
  });

  const [result] = await Donor.aggregate(pipeline);
  const rows: Record<string, any>[] = result?.data ?? [];
  const total: number = result?.totalCount?.[0]?.count ?? 0;

  const data = rows.map((row) => serializeDonor(row));
  res.status(200).json(buildPaginatedResponse(data, total, page, limit));
}

/** GET /donors/:id */
export async function getDonor(req: Request<{ id: string }>, res: Response) {
  const donor = await Donor.findById(req.params.id).populate("medicalRecord");
  if (!donor) throw ApiError.notFound("Donor not found");
  res.status(200).json(serializeDonor(donor.toObject()));
}

/** POST /donors — Admin/Super Admin creates a new donor profile. */
export async function createDonor(req: Request<unknown, unknown, CreateDonorInput>, res: Response) {
  const body = req.body;

  const donor = await Donor.create({
    name: body.name,
    phone: body.phone,
    email: body.email,
    passwordHash: body.password || undefined,
    bloodGroup: body.bloodGroup,
    gender: body.gender,
    dob: new Date(body.dob),
    address: {
      division: body.address.division,
      district: body.address.district,
      upazila: body.address.upazila,
      addressLine: body.address.addressLine || undefined,
    },
    lastDonationDate: body.lastDonationDate ? new Date(body.lastDonationDate) : null,
    availability: body.availability ?? true,
  });

  res.status(201).json(serializeDonor(donor.toObject()));
}

/** PUT /donors/:id — Admin/Super Admin updates a donor profile. */
export async function updateDonor(req: Request<{ id: string }, unknown, UpdateDonorInput>, res: Response) {
  const donor = await Donor.findById(req.params.id);
  if (!donor) throw ApiError.notFound("Donor not found");

  const body = req.body;

  if (body.name !== undefined) donor.name = body.name;
  if (body.phone !== undefined) donor.phone = body.phone;
  if (body.email !== undefined) donor.email = body.email;
  if (body.password) donor.passwordHash = body.password; // pre-save hook re-hashes
  if (body.bloodGroup !== undefined) donor.bloodGroup = body.bloodGroup;
  if (body.gender !== undefined) donor.gender = body.gender;
  if (body.dob !== undefined) donor.dob = new Date(body.dob);
  if (body.availability !== undefined) donor.availability = body.availability;
  if (body.address) {
    donor.address = {
      division: body.address.division ?? donor.address.division,
      district: body.address.district ?? donor.address.district,
      upazila: body.address.upazila ?? donor.address.upazila,
      addressLine: body.address.addressLine ?? donor.address.addressLine,
    };
  }
  if (Object.prototype.hasOwnProperty.call(body, "lastDonationDate")) {
    donor.lastDonationDate = body.lastDonationDate ? new Date(body.lastDonationDate) : null;
  }

  await donor.save();
  await donor.populate("medicalRecord");

  res.status(200).json(serializeDonor(donor.toObject()));
}

/** DELETE /donors/:id — Super Admin only. */
export async function deleteDonor(req: Request<{ id: string }>, res: Response) {
  const donor = await Donor.findById(req.params.id);
  if (!donor) throw ApiError.notFound("Donor not found");

  await Promise.all([
    Donor.deleteOne({ _id: donor._id }),
    MedicalRecord.deleteOne({ donorId: donor._id }),
  ]);

  res.status(204).end();
}

/** PUT /donors/:id/medical-record — creates or updates the donor's medical record and recalculates eligibility. */
export async function upsertMedicalRecord(
  req: Request<{ id: string }, unknown, MedicalRecordInput>,
  res: Response
) {
  const donor = await Donor.findById(req.params.id);
  if (!donor) throw ApiError.notFound("Donor not found");

  const body = req.body;

  const eligibilityStatus = computeEligibility({
    gender: donor.gender,
    weightKg: body.weightKg,
    hemoglobin: body.hemoglobin,
    conditions: body.conditions,
    lastDonationDate: donor.lastDonationDate,
  });

  const record = await MedicalRecord.findOneAndUpdate(
    { donorId: donor._id },
    {
      $set: {
        weightKg: body.weightKg,
        bloodPressure: body.bloodPressure,
        hemoglobin: body.hemoglobin,
        conditions: body.conditions,
        currentMedications: body.currentMedications || undefined,
        eligibilityStatus,
        updatedBy: req.user!.id,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  res.status(200).json(serializeMedicalRecord(record));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
