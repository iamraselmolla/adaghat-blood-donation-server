import { env } from "../config/env";
import { EligibilityStatus, Gender, IMedicalConditions } from "../models/Donor.model";

export interface EligibilityInput {
  gender: Gender;
  dob: Date | string;
  weightKg: number;
  hemoglobin: number;
  conditions: IMedicalConditions;
}

function ageFromDob(dob: Date | string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Classifies a donor's *medical* eligibility from their current medical record.
 * This is independent of the date-based donation cooldown (see isDateEligible below) -
 * the two are combined by the frontend's EligibilityBadge and by canDonateNow() here.
 */
export function computeEligibilityStatus(input: EligibilityInput): EligibilityStatus {
  const { gender, dob, weightKg, hemoglobin, conditions } = input;
  const age = ageFromDob(dob);
  const minHemoglobin =
    gender === "FEMALE" ? env.eligibility.minHemoglobinFemale : env.eligibility.minHemoglobinMale;

  // Hard blocks: permanent or serious medical conditions / vitals outside safe range.
  if (
    conditions.hiv ||
    conditions.hepatitis ||
    conditions.heartDisease ||
    weightKg < env.eligibility.minWeightKg ||
    hemoglobin < minHemoglobin ||
    age < env.eligibility.minDonorAge ||
    age > env.eligibility.maxDonorAge
  ) {
    return "INELIGIBLE";
  }

  // Temporary deferrals: safe to donate again after a short recovery window,
  // flagged for staff review rather than an automatic hard block.
  if (conditions.recentSurgery || conditions.recentTattoo || conditions.diabetes) {
    return "PENDING_REVIEW";
  }

  return "ELIGIBLE";
}

export function daysSince(date?: Date | string | null): number {
  if (!date) return Infinity;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Blood donation cooldown rule: must be at least MIN_DONATION_GAP_DAYS since last donation. */
export function isDateEligible(lastDonationDate?: Date | string | null): boolean {
  return daysSince(lastDonationDate) >= env.eligibility.minDonationGapDays;
}

export function daysUntilEligible(lastDonationDate?: Date | string | null): number {
  if (!lastDonationDate) return 0;
  const remaining = env.eligibility.minDonationGapDays - daysSince(lastDonationDate);
  return Math.max(0, remaining);
}

export interface DonationEligibilityResult {
  eligible: boolean;
  reason?: string;
  remainingDays?: number;
}

/**
 * Full check applied when actually recording a new donation: combines the
 * date-based cooldown with the donor's current medical eligibility status.
 */
export function canDonateNow(donor: {
  lastDonationDate?: Date | string | null;
  medicalRecord?: { eligibilityStatus?: EligibilityStatus };
}): DonationEligibilityResult {
  if (!isDateEligible(donor.lastDonationDate)) {
    return {
      eligible: false,
      reason: "Donor has not reached the minimum gap since their last donation.",
      remainingDays: daysUntilEligible(donor.lastDonationDate),
    };
  }

  if (donor.medicalRecord?.eligibilityStatus === "INELIGIBLE") {
    return { eligible: false, reason: "Donor is medically ineligible to donate." };
  }

  return { eligible: true };
}
