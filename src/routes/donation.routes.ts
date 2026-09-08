import { Router } from "express";

import * as donationController from "../controllers/donation.controller";
import { protect, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createDonationSchema } from "../validators/donation.validator";

const router = Router();

router.use(protect);

router.get("/", donationController.listDonations);
router.post("/", authorize("ADMIN", "SUPER_ADMIN"), validate(createDonationSchema), donationController.createDonation);

export default router;
