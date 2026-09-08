import { Router } from "express";

import * as donorController from "../controllers/donor.controller";
import { listDonationsByDonor } from "../controllers/donation.controller";
import { protect, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createDonorSchema, updateDonorSchema, updateMedicalRecordSchema } from "../validators/donor.validator";

const router = Router();

router.use(protect);

router.get("/", donorController.listDonors);
router.get("/:id", donorController.getDonorById);
router.get("/:id/donations", listDonationsByDonor);

router.post("/", authorize("ADMIN", "SUPER_ADMIN"), validate(createDonorSchema), donorController.createDonor);
router.put("/:id", authorize("ADMIN", "SUPER_ADMIN"), validate(updateDonorSchema), donorController.updateDonor);
router.delete("/:id", authorize("SUPER_ADMIN"), donorController.deleteDonor);

router.put(
  "/:id/medical-record",
  authorize("ADMIN", "SUPER_ADMIN"),
  validate(updateMedicalRecordSchema),
  donorController.updateMedicalRecord
);

export default router;
