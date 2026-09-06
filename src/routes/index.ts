import { Router } from "express";
import authRoutes from "../routes/auth.routes";
import donorRoutes from "../routes/donor.routes";
import adminRoutes from "../routes/admin.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/donors", donorRoutes);
router.use("/admin", adminRoutes);

export default router;
