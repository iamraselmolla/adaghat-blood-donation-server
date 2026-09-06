import { z } from "zod";
import { BLOOD_GROUPS, ELIGIBILITY, GENDERS } from "../constants/roles";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const idParamSchema = z.object({ id: objectIdSchema });

const addressInputSchema = z.object({
  division: z.string().trim().min(1, "Division is required"),
  district: z.string().trim().min(1, "District is required"),
  upazila: z.string().trim().min(1, "Upazila is required"),
  addressLine: z.string().trim().optional().or(z.literal("")),
});

const donorBaseSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().min(6, "Valid phone number required").max(20),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  password: z.string().min(6, "Minimum 6 characters").optional().or(z.literal("")),
  bloodGroup: z.enum(BLOOD_GROUPS),
  gender: z.enum(GENDERS),
  dob: z.string().min(1, "Date of birth is required"),
  address: addressInputSchema,
  lastDonationDate: z.string().nullable().optional().or(z.literal("")),
  availability: z.boolean().optional().default(true),
});

export const createDonorSchema = donorBaseSchema;

export const updateDonorSchema = donorBaseSchema.partial().extend({
  address: addressInputSchema.partial().optional(),
});

export const medicalRecordSchema = z.object({
  weightKg: z.coerce.number().min(30, "Weight must be at least 30kg").max(300),
  bloodPressure: z
    .string()
    .trim()
    .regex(/^\d{2,3}\/\d{2,3}$/, "Format: 120/80"),
  hemoglobin: z.coerce.number().min(5).max(25),
  conditions: z
    .object({
      diabetes: z.boolean().default(false),
      hepatitis: z.boolean().default(false),
      hiv: z.boolean().default(false),
      heartDisease: z.boolean().default(false),
      recentSurgery: z.boolean().default(false),
      recentTattoo: z.boolean().default(false),
    })
    .default({}),
  currentMedications: z.string().trim().max(500).optional().or(z.literal("")),
});

export const listDonorsQuerySchema = z.object({
  search: z.string().trim().optional(),
  bloodGroup: z.enum([...BLOOD_GROUPS, "ALL"] as [string, ...string[]]).optional(),
  division: z.string().trim().optional(),
  district: z.string().trim().optional(),
  upazila: z.string().trim().optional(),
  availability: z.enum(["ALL", "AVAILABLE", "UNAVAILABLE"]).optional(),
  eligibility: z
    .enum(["ALL", "ELIGIBLE", "INELIGIBLE", ELIGIBILITY.PENDING_REVIEW])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateDonorInput = z.infer<typeof createDonorSchema>;
export type UpdateDonorInput = z.infer<typeof updateDonorSchema>;
export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
export type ListDonorsQuery = z.infer<typeof listDonorsQuerySchema>;
