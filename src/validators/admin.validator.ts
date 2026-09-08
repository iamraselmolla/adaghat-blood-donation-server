import { z } from "zod";

export const updateStaffRoleSchema = z.object({
  body: z.object({
    role: z.enum(["SUPER_ADMIN", "ADMIN", "MEMBER"]),
  }),
});

export const updateStaffStatusSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "DISABLED"]),
  }),
});
