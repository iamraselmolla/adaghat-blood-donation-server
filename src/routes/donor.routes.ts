import { Router } from "express";
import * as donorController from "@/controllers/donor.controller";
import { protect } from "@/middlewares/auth.middleware";
import { authorize } from "@/middlewares/rbac.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { ROLES } from "@/constants/roles";
import {
  createDonorSchema,
  idParamSchema,
  listDonorsQuerySchema,
  medicalRecordSchema,
  updateDonorSchema,
} from "@/validators/donor.validator";

const router = Router();

const ALL_STAFF = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER];
const WRITE_STAFF = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

// Every donor route requires authentication; MEMBER is read-only by simply
// never appearing in the write routes' allowed-roles list.
router.use(protect);

router.get(
  "/",
  authorize(...ALL_STAFF),
  validate({ query: listDonorsQuerySchema }),
  donorController.listDonors
);

router.get(
  "/:id",
  authorize(...ALL_STAFF),
  validate({ params: idParamSchema }),
  donorController.getDonor
);

router.post(
  "/",
  authorize(...WRITE_STAFF),
  validate({ body: createDonorSchema }),
  donorController.createDonor
);

router.put(
  "/:id",
  authorize(...WRITE_STAFF),
  validate({ params: idParamSchema, body: updateDonorSchema }),
  donorController.updateDonor
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN),
  validate({ params: idParamSchema }),
  donorController.deleteDonor
);

router.put(
  "/:id/medical-record",
  authorize(...WRITE_STAFF),
  validate({ params: idParamSchema, body: medicalRecordSchema }),
  donorController.upsertMedicalRecord
);

export default router;
