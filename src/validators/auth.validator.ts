import { z } from "zod";
import { ROLES } from "@/constants/roles";

const identifierSchema = z
  .string()
  .trim()
  .min(3, "Required")
  .refine(
    (val) => /^\S+@\S+\.\S+$/.test(val) || /^\+?[0-9]{10,14}$/.test(val),
    "Enter a valid email or phone number"
  );

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerStaffSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  identifier: identifierSchema,
  password: z.string().min(6, "Minimum 6 characters"),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER]).default(ROLES.MEMBER),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterStaffInput = z.infer<typeof registerStaffSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
