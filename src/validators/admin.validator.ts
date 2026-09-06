import { z } from "zod";
import { ROLES, STATUS } from "@/constants/roles";
import { objectIdSchema } from "@/validators/donor.validator";

export const staffIdParamSchema = z.object({ id: objectIdSchema });

export const updateStaffRoleSchema = z.object({
  role: z.enum([ROLES.ADMIN, ROLES.MEMBER]),
});

export const updateStaffStatusSchema = z.object({
  status: z.enum([STATUS.ACTIVE, STATUS.DISABLED]),
});

export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;
export type UpdateStaffStatusInput = z.infer<typeof updateStaffStatusSchema>;
