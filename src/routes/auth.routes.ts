import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { protect, optionalAuth } from "../middlewares/auth.middleware";
import { loginSchema, refreshSchema, registerStaffSchema } from "../validators/auth.validator";

const router = Router();

// Tighter rate limit on auth endpoints to slow down credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later", statusCode: 429 },
});

router.post("/login", authLimiter, validate({ body: loginSchema }), authController.login);

// Dual purpose: public self sign-up (always MEMBER) or Super Admin creating staff.
// optionalAuth attaches req.user when a valid token is supplied, without requiring one.
router.post(
  "/register-staff",
  authLimiter,
  optionalAuth,
  validate({ body: registerStaffSchema }),
  authController.registerStaff
);

router.post("/refresh", authLimiter, validate({ body: refreshSchema }), authController.refresh);

router.get("/me", protect, authController.me);
router.post("/logout", protect, authController.logout);

export default router;
