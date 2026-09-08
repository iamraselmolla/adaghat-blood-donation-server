import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, "Email or phone is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const registerStaffSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required"),
    identifier: z.string().min(3, "Email or phone is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    // Ignored unless the caller is an authenticated SUPER_ADMIN - see auth.controller.ts
    role: z.enum(["SUPER_ADMIN", "ADMIN", "MEMBER"]).optional(),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "refreshToken is required"),
  }),
});
