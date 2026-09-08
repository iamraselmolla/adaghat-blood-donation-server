import { z } from "zod";

export const createDonationSchema = z.object({
  body: z.object({
    donorId: z.string().min(1, "Select a donor"),
    donationDate: z
      .string()
      .min(1, "Date is required")
      .refine((val) => new Date(val).getTime() <= Date.now(), "Donation date cannot be in the future"),
    location: z.string().min(2, "Location is required (e.g. hospital or blood bank)"),
    recipientName: z.string().min(2, "Recipient / patient name is required"),
    requestedByName: z.string().optional(),
    requestedByPhone: z
      .string()
      .optional()
      .refine((val) => !val || /^\+?[0-9]{10,14}$/.test(val), "Enter a valid phone number"),
    notes: z.string().optional(),
  }),
});
