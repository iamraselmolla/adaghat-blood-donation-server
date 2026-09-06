import { DONATION_INTERVAL_DAYS, ELIGIBILITY, EligibilityStatus, Gender } from "../constants/roles";

export interface MedicalConditions {
  diabetes: boolean;
  hepatitis: boolean;
  hiv: boolean;
  heartDisease: boolean;
  recentSurgery: boolean;
  recentTattoo: boolean;
}

export interface EligibilityInput {
  gender: Gender;
  weightKg: number;
  hemoglobin: number;
  conditions: MedicalConditions;
  lastDonationDate?: Date | string | null;
}

/**
 * Autocalculates donor eligibility from:
 *  1. Hard medical disqualifiers (HIV / Hepatitis) -> INELIGIBLE
 *  2. Minimum weight (WHO guideline: 45kg) -> INELIGIBLE
 *  3. Hemoglobin thresholds (13.0 g/dL male, 12.5 g/dL female/other) -> INELIGIBLE
 *  4. Temporary deferral flags requiring clinical sign-off
 *     (diabetes, heart disease, recent surgery, recent tattoo) -> PENDING_REVIEW
 *  5. The 120-day minimum donation interval -> INELIGIBLE until due
 *  6. Otherwise -> ELIGIBLE
 */
export function computeEligibility(input: EligibilityInput): EligibilityStatus {
  const { gender, weightKg, hemoglobin, conditions, lastDonationDate } = input;

  if (conditions.hiv || conditions.hepatitis) {
    return ELIGIBILITY.INELIGIBLE;
  }

  if (weightKg > 0 && weightKg < 45) {
    return ELIGIBILITY.INELIGIBLE;
  }

  const minHemoglobin = gender === "MALE" ? 13.0 : 12.5;
  if (hemoglobin > 0 && hemoglobin < minHemoglobin) {
    return ELIGIBILITY.INELIGIBLE;
  }

  if (lastDonationDate) {
    const daysSince = daysBetween(new Date(lastDonationDate), new Date());
    if (daysSince < DONATION_INTERVAL_DAYS) {
      return ELIGIBILITY.INELIGIBLE;
    }
  }

  if (
    conditions.diabetes ||
    conditions.heartDisease ||
    conditions.recentSurgery ||
    conditions.recentTattoo
  ) {
    return ELIGIBILITY.PENDING_REVIEW;
  }

  return ELIGIBILITY.ELIGIBLE;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

/** Next date this donor becomes eligible again purely on the 120-day interval. */
export function nextEligibleDate(lastDonationDate?: Date | string | null): Date | null {
  if (!lastDonationDate) return null;
  const next = new Date(lastDonationDate);
  next.setDate(next.getDate() + DONATION_INTERVAL_DAYS);
  return next;
}
