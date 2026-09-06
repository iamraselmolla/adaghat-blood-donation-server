export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER];

// Roles that are allowed to write (create/update) donor & medical data.
export const WRITE_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const STATUS = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const ELIGIBILITY = {
  ELIGIBLE: "ELIGIBLE",
  INELIGIBLE: "INELIGIBLE",
  PENDING_REVIEW: "PENDING_REVIEW",
} as const;
export type EligibilityStatus = (typeof ELIGIBILITY)[keyof typeof ELIGIBILITY];

// Minimum days that must pass between two whole-blood donations.
export const DONATION_INTERVAL_DAYS = 120;
