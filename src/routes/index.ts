import { Router } from "express";

import authRoutes from "./auth.routes";
import donorRoutes from "./donor.routes";
import donationRoutes from "./donation.routes";
import adminRoutes from "./admin.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/donors", donorRoutes);
router.use("/donations", donationRoutes);
router.use("/admin", adminRoutes);

export default router;
