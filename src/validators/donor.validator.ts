import { z } from "zod";

const addressSchema = z.object({
  division: z.string().min(1, "Division is required"),
  district: z.string().min(1, "District is required"),
  upazila: z.string().min(1, "Upazila is required"),
  addressLine: z.string().optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

const bloodGroupEnum = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

export const createDonorSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required"),
    phone: z.string().min(10, "Valid phone number required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    password: z.string().min(6).optional().or(z.literal("")), // optional donor login account
    bloodGroup: bloodGroupEnum,
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    dob: z.string().min(1, "Date of birth is required"),
    address: addressSchema,
    lastDonationDate: z.string().nullable().optional(),
    availability: z.boolean().optional().default(true),
  }),
});

export const updateDonorSchema = z.object({
  body: createDonorSchema.shape.body.partial(),
});

const conditionsSchema = z.object({
  diabetes: z.boolean().default(false),
  hepatitis: z.boolean().default(false),
  hiv: z.boolean().default(false),
  heartDisease: z.boolean().default(false),
  recentSurgery: z.boolean().default(false),
  recentTattoo: z.boolean().default(false),
});

export const updateMedicalRecordSchema = z.object({
  body: z.object({
    weightKg: z.coerce.number().min(30, "Weight must be at least 30kg").max(250),
    bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "Format: 120/80"),
    hemoglobin: z.coerce.number().min(5).max(25),
    conditions: conditionsSchema,
    currentMedications: z.string().optional(),
  }),
});
