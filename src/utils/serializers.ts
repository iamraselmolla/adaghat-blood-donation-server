import { IUser } from "../models/user.model";
import { IDonor } from "../models/donor.model";
import { IMedicalRecord } from "../models/medicalRecord.model";

/** Matches frontend `AuthUser` (types/index.ts) — note: uses `id`, not `_id`. */
export function serializeAuthUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    identifier: user.identifier,
    role: user.role,
    status: user.status,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };
}

/** Matches frontend `StaffMember` (types/index.ts) — note: uses `_id`. */
export function serializeStaffMember(user: IUser) {
  return {
    _id: user._id.toString(),
    name: user.name,
    identifier: user.identifier,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    ...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt } : {}),
  };
}

/** Matches frontend `MedicalRecord` (types/index.ts). */
export function serializeMedicalRecord(record: IMedicalRecord | Record<string, any>) {
  return {
    _id: record._id?.toString(),
    donorId: record.donorId?.toString(),
    weightKg: record.weightKg,
    bloodPressure: record.bloodPressure,
    hemoglobin: record.hemoglobin,
    conditions: {
      diabetes: !!record.conditions?.diabetes,
      hepatitis: !!record.conditions?.hepatitis,
      hiv: !!record.conditions?.hiv,
      heartDisease: !!record.conditions?.heartDisease,
      recentSurgery: !!record.conditions?.recentSurgery,
      recentTattoo: !!record.conditions?.recentTattoo,
    },
    currentMedications: record.currentMedications || undefined,
    eligibilityStatus: record.eligibilityStatus,
    updatedBy: record.updatedBy ? record.updatedBy.toString() : undefined,
    updatedAt: record.updatedAt,
  };
}

/** Matches frontend `Donor` (types/index.ts). Accepts a populated Mongoose doc or a plain aggregation result. */
export function serializeDonor(donor: IDonor | Record<string, any>) {
  const address = donor.address ?? {};
  const location = donor.location as { coordinates?: [number, number] } | undefined;

  const coordinates =
    location?.coordinates && location.coordinates.length === 2
      ? { lng: location.coordinates[0], lat: location.coordinates[1] }
      : undefined;

  const rawMedicalRecord = (donor as any).medicalRecord;

  return {
    _id: donor._id.toString(),
    userId: donor.userId ? donor.userId.toString() : undefined,
    name: donor.name,
    phone: donor.phone,
    email: donor.email || undefined,
    bloodGroup: donor.bloodGroup,
    gender: donor.gender,
    dob: donor.dob,
    address: {
      division: address.division,
      district: address.district,
      upazila: address.upazila,
      addressLine: address.addressLine || undefined,
      ...(coordinates ? { coordinates } : {}),
    },
    lastDonationDate: donor.lastDonationDate ?? null,
    availability: !!donor.availability,
    medicalRecord: rawMedicalRecord ? serializeMedicalRecord(rawMedicalRecord) : undefined,
    createdAt: donor.createdAt,
    avatarUrl: donor.avatarUrl || undefined,
  };
}
