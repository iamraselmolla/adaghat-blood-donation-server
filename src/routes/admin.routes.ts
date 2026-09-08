import { Router } from "express";

import * as adminController from "../controllers/admin.controller";
import { protect, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { updateStaffRoleSchema, updateStaffStatusSchema } from "../validators/admin.validator";

const router = Router();

router.use(protect);

// Dashboard is visible to every authenticated role (SUPER_ADMIN, ADMIN, MEMBER).
router.get("/stats", adminController.getStats);

// Staff management is SUPER_ADMIN only (matches usePermissions().canManageStaff).
router.get("/staff", authorize("SUPER_ADMIN"), adminController.listStaff);
router.put(
  "/staff/:id/role",
  authorize("SUPER_ADMIN"),
  validate(updateStaffRoleSchema),
  adminController.updateStaffRole
);
router.put(
  "/staff/:id/status",
  authorize("SUPER_ADMIN"),
  validate(updateStaffStatusSchema),
  adminController.toggleStaffStatus
);

export default router;
