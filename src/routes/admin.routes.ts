import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { protect } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { ROLES } from "../constants/roles";
import {
  staffIdParamSchema,
  updateStaffRoleSchema,
  updateStaffStatusSchema,
} from "../validators/admin.validator";

const router = Router();

router.use(protect);

// Dashboard stats are visible to every authenticated staff role, including
// read-only Members.
router.get(
  "/stats",
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER),
  adminController.getStats
);

// Staff (Admin/Member) management is exclusive to the Super Admin.
router.get("/staff", authorize(ROLES.SUPER_ADMIN), adminController.listStaff);

router.put(
  "/staff/:id/role",
  authorize(ROLES.SUPER_ADMIN),
  validate({ params: staffIdParamSchema, body: updateStaffRoleSchema }),
  adminController.updateStaffRole
);

router.put(
  "/staff/:id/status",
  authorize(ROLES.SUPER_ADMIN),
  validate({ params: staffIdParamSchema, body: updateStaffStatusSchema }),
  adminController.toggleStaffStatus
);

export default router;
