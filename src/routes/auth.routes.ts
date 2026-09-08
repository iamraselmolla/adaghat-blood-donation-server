import { Router } from "express";

import * as authController from "../controllers/auth.controller";
import { protect, optionalAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { loginSchema, registerStaffSchema, refreshSchema } from "../validators/auth.validator";

const router = Router();

router.post("/login", validate(loginSchema), authController.login);

// optionalAuth: public self-registration (forces MEMBER) vs SUPER_ADMIN staff creation.
router.post("/register-staff", optionalAuth, validate(registerStaffSchema), authController.registerStaff);

router.get("/me", protect, authController.me);
router.post("/logout", protect, authController.logout);
router.post("/refresh", validate(refreshSchema), authController.refresh);

export default router;
